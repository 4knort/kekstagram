/**
 * @fileoverview
 * @author Igor Alexeenko (o0)
 */

'use strict';

define([
  'resizer'
], function(Resizer) {
  /** @enum {string} */
  var FileType = {
    'GIF': '',
    'JPEG': '',
    'PNG': '',
    'SVG+XML': ''
  };

  /** @enum {number} */
  var Action = {
    ERROR: 0,
    UPLOADING: 1,
    CUSTOM: 2
  };

  /**
   * Регулярное выражение, проверяющее тип загружаемого файла. Составляется
   * из ключей FileType.
   * @type {RegExp}
   */
  var fileRegExp = new RegExp('^image/(' + Object.keys(FileType).join('|').replace('\+', '\\+') + ')$', 'i');

  /**
   * @type {Object.<string, string>}
   */
  var filterMap;

  /**
   * Объект, который занимается кадрированием изображения.
   * @type {Resizer}
   */
  var currentResizer;

  /**
   * Удаляет текущий объект {@link Resizer}, чтобы создать новый с другим
   * изображением.
   */
  function cleanupResizer() {
    if (currentResizer) {
      currentResizer.remove();
      currentResizer = null;
    }
  }

  /**
   * Ставит одну из трех случайных картинок на фон формы загрузки.
   */
  function updateBackground() {
    var images = [
      'img/logo-background-1.jpg',
      'img/logo-background-2.jpg',
      'img/logo-background-3.jpg'
    ];

    var backgroundElement = document.querySelector('.upload');
    var randomImageNumber = Math.round(Math.random() * (images.length - 1));
    backgroundElement.style.backgroundImage = 'url(' + images[randomImageNumber] + ')';
  }

  /**
   * Проверяет, валидны ли данные, в форме кадрирования.
   * @return {boolean}
   */
  function resizeFormIsValid() {
    return true;
  }

  /**
   * Форма загрузки изображения.
   * @type {HTMLFormElement}
   */
  var uploadForm = document.forms['upload-select-image'];

  /**
   * Форма кадрирования изображения.
   * @type {HTMLFormElement}
   */
  var resizeForm = document.forms['upload-resize'];

  /**
   * Форма добавления фильтра.
   * @type {HTMLFormElement}
   */
  var filterForm = document.forms['upload-filter'];

  /**
   * @type {HTMLImageElement}
   */
  var filterImage = filterForm.querySelector('.filter-image-preview');

  /**
   * @type {HTMLElement}
   */
  var uploadMessage = document.querySelector('.upload-message');

  /**
   * @param {Action} action
   * @param {string=} message
   * @return {Element}
   */
  function showMessage(action, message) {
    var isError = false;

    switch (action) {
      case Action.UPLOADING:
        message = message || 'Кексограмим&hellip;';
        break;

      case Action.ERROR:
        isError = true;
        message = message || 'Неподдерживаемый формат файла<br> <a href="' + document.location + '">Попробовать еще раз</a>.';
        break;
    }

    uploadMessage.querySelector('.upload-message-container').innerHTML = message;
    uploadMessage.classList.remove('invisible');
    uploadMessage.classList.toggle('upload-message-error', isError);
    return uploadMessage;
  }

  function hideMessage() {
    uploadMessage.classList.add('invisible');
  }

  /**
   * Обработчик изменения изображения в форме загрузки. Если загруженный
   * файл является изображением, считывается исходник картинки, создается
   * Resizer с загруженной картинкой, добавляется в форму кадрирования
   * и показывается форма кадрирования.
   * @param {Event} evt
   */
  uploadForm.onchange = function(evt) {
    var element = evt.target;
    if (element.id === 'upload-file') {
      // Проверка типа загружаемого файла, тип должен быть изображением
      // одного из форматов: JPEG, PNG, GIF или SVG.
      if (fileRegExp.test(element.files[0].type)) {
        var fileReader = new FileReader();

        showMessage(Action.UPLOADING);

        fileReader.onload = function() {
          cleanupResizer();

          currentResizer = new Resizer(fileReader.result);
          currentResizer.setElement(resizeForm);
          uploadMessage.classList.add('invisible');

          uploadForm.classList.add('invisible');
          resizeForm.classList.remove('invisible');

          hideMessage();
        };

        fileReader.readAsDataURL(element.files[0]);
      } else {
        // Показ сообщения об ошибке, если загружаемый файл, не является
        // поддерживаемым изображением.
        showMessage(Action.ERROR);
      }
    }
  };

  /**
   * Обработка сброса формы кадрирования. Возвращает в начальное состояние
   * и обновляет фон.
   * @param {Event} evt
   */
  resizeForm.onreset = function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    resizeForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  };

  /**
   * Обработка отправки формы кадрирования. Если форма валидна, экспортирует
   * кропнутое изображение в форму добавления фильтра и показывает ее.
   * @param {Event} evt
   */
  resizeForm.onsubmit = function(evt) {
    evt.preventDefault();

    if (resizeFormIsValid()) {
      filterImage.src = currentResizer.exportImage().src;

      resizeForm.classList.add('invisible');
      filterForm.classList.remove('invisible');
    }
  };

  /**
   * Сброс формы фильтра. Показывает форму кадрирования.
   * @param {Event} evt
   */
  filterForm.onreset = function(evt) {
    evt.preventDefault();

    filterForm.classList.add('invisible');
    resizeForm.classList.remove('invisible');
  };

  /**
   * Отправка формы фильтра. Возвращает в начальное состояние, предварительно
   * записав сохраненный фильтр в cookie.
   * @param {Event} evt
   */
  filterForm.onsubmit = function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    filterForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  };

  /**
   * Обработчик изменения фильтра. Добавляет класс из filterMap соответствующий
   * выбранному значению в форме.
   */
  filterForm.onchange = function() {
    if (!filterMap) {
      // Ленивая инициализация. Объект не создается до тех пор, пока
      // не понадобится прочитать его в первый раз, а после этого запоминается
      // навсегда.
      filterMap = {
        'none': 'filter-none',
        'chrome': 'filter-chrome',
        'sepia': 'filter-sepia'
      };
    }

    var selectedFilter = [].filter.call(filterForm['upload-filter'], function(item) {
      return item.checked;
    })[0].value;

    // Класс перезаписывается, а не обновляется через classList потому что нужно
    // убрать предыдущий примененный класс. Для этого нужно или запоминать его
    // состояние или просто перезаписывать.
    filterImage.className = 'filter-image-preview ' + filterMap[selectedFilter];
  };

  cleanupResizer();
  updateBackground();


  /*global docCookies*/

  // переменные  с инпутами
  var resizeX = document.querySelector('#resize-x');
  var resizeY = document.querySelector('#resize-y');
  var resizeSide = document.querySelector('#resize-size');

  resizeX.min = 0;
  resizeY.min = 0;

  resizeX.value = 0;
  resizeY.value = 0;
  resizeSide.value = 0;

  // функция которая ограничаивает максимально возможно размеры ширины для отправки
  function resizeWidth(size, side) {
    var sum = parseInt(size, 10) + parseInt(side, 10);
    if (sum > currentResizer._image.naturalWidth) {
      resizeX.max = currentResizer._image.naturalWidth;
      resizeSide.max = 0;
    } else {
      resizeX.max = resizeX.value + (currentResizer._image.naturalWidth - resizeX.value);
      resizeSide.max = currentResizer._image.naturalWidth - resizeX.value;
    }
  }

// функция которая ограничаивает максимально возможно размеры высоты для отправки
  function resizeHeight(size, side) {
    var sum = parseInt(size, 10) + parseInt(side, 10);
    if (sum > currentResizer._image.naturalHeight) {
      resizeY.max = currentResizer._image.naturalHeight;
      resizeSide.max = 0;
    } else {
      resizeY.max = resizeY.value + (currentResizer._image.naturalHeight - resizeY.value);
      resizeSide.max = currentResizer._image.naturalHeight - resizeY.value;
    }
  }

  function resizingSide(sizeX, sizeY) {
    if (sizeX > sizeY) {
      resizeSide.max = currentResizer._image.naturalWidth - resizeX.value;
    } else {
      resizeSide.max = currentResizer._image.naturalHeight - resizeY.value;
    }
  }

  // создаем событие onchange на поле ширины
  resizeX.addEventListener('change', function() {
    resizeWidth(resizeX.value, resizeSide.value);
    valid();
  });

  // создаем событие onchange на поле высоты
  resizeY.addEventListener('change', function() {
    resizeHeight(resizeY.value, resizeSide.value);
    valid();
  });

  // проверяем поле 'сторона' на валидность
  resizeSide.addEventListener('change', function() {
    resizingSide(resizeX.value, resizeY.value);
    valid();
  });

  // отключение кнопки сабмит(проверка на валидность форм)
  function valid() {
    var isValid = true;
    var submitButton = document.getElementById('resize-fwd');
    var formLength = document.forms['upload-resize'].elements.length;
    var formElements = document.forms['upload-resize'].elements;

    for (var i = 0; i < formLength; i++) {
      isValid = formElements[i].validity.valid;

      if (!isValid) {
        submitButton.disabled = !isValid;
        break;
      } else {
        submitButton.disabled = false;
      }
    }
  }

  // cookie
  var formFilter = document.querySelector('#upload-filter');
  var radios = formFilter.querySelectorAll('input[type=radio]');
  var radioActive;


  formFilter.addEventListener('submit', function() {
    event.preventDefault();

    var myBirth = new Date('2015-08-19').valueOf();
    var dateToExpire = Date.now() + (Date.now() - myBirth);
    var formattedDateToExpire = new Date(dateToExpire).toUTCString();

    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        radioActive = radios[i];
      }
    }
    document.cookie = 'filter=' + radioActive.id + ';expires=' + formattedDateToExpire;

  });

  var radioFilter = document.getElementById(docCookies.getItem('filter'));
  if (radioFilter === 'object') {
    radioFilter.checked = true;
  }

  if (document.getElementById('upload-filter-none').checked === true) {
    filterImage.className = 'filter-image-preview ' + 'filter-none';
  } else if (document.getElementById('upload-filter-chrome').checked === true) {
    filterImage.className = 'filter-image-preview ' + 'filter-chrome';
  } else {
    filterImage.className = 'filter-image-preview ' + 'filter-sepia';
  }

  function onInput() {
    currentResizer.setConstraint(parseInt(resizeX.value, 10),
                                 parseInt(resizeY.value, 10),
                                 parseInt(resizeSide.value, 10));
  }

  resizeX.addEventListener('input', onInput);
  resizeY.addEventListener('input', onInput);
  resizeSide.addEventListener('input', onInput);

  window.addEventListener('resizerchange', function() {
    resizeX.value = parseInt(currentResizer.getConstraint().x, 10);
    resizeY.value = parseInt(currentResizer.getConstraint().y, 10);
    resizeSide.value = parseInt(currentResizer.getConstraint().side, 10);
  });
});


