'use strict';

(function() {

  function Photo(picture) {
    this._picture = picture;
    this._onClick = this._onClick.bind(this);
  }

  Photo.prototype.render = function() {
    //шаблон
    var template = document.querySelector('#picture-template');
    this.element = template.content.children[0].cloneNode(true);
    this.element.querySelector('.picture-likes').textContent = this._picture.likes;
    this.element.querySelector('.picture-comments').textContent = this._picture.comments;

    //изображения
    var imgTag = this.element.querySelector('img');
    var image = new Image(182, 182);
    var imageLoadTimeout;

    //загрузка изображения
    image.addEventListener('load', function() {
      clearTimeout(imageLoadTimeout);
      this.element.replaceChild(image, imgTag);
    }.bind(this));

    // если произойдет ошибка загрузки изображения
    image.addEventListener('error', function() {
      this.element.classList.add('picture-load-failure');
    }.bind(this));
    image.src = this._picture.url;

    //если сервер не овтечает
    var IMAGE_TIMEOUT = 10000;
    imageLoadTimeout = setTimeout(function() {
      image.src = '';
      this.element.classList.add('picture-load-failure');
    }.bind(this), IMAGE_TIMEOUT);

    this.element.addEventListener('click', this._onClick);
  };

  Photo.prototype.remove = function() {
    this.element.removeEventListener('click', this._onClick);
  };

  Photo.prototype._onClick = function(evt) {
    evt.preventDefault();
    if (this.element.classList.contains('picture') &&
      !this.element.classList.contains('picture-load-failure')) {
      if (typeof this.onClick === 'function') {
        this.onClick();
      }
    }
  };



  Photo.prototype.onClick = null;

  // Photo.prototype.setData = function(picture) {
  //   this._picture = picture;
  // };

  // Photo.prototype.getData = function() {
  //   return this._picture;
  // };

  window.Photo = Photo;
})();
