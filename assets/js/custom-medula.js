'use strict';

var tools = {
  scrollTo: function(element){
     $('html, body').animate({ scrollTop: $(element).offset().top }, 1000);
  },
  trim: function(string){
    return string.replace(/^\s+/g,'').replace(/\s+$/g,'');
  },
  msgBox: function(element, id){
    if(element == ''){
      if($('#msgbox-'+id).length > 0) {
        $('#msgbox-'+id).remove();
      }
    } else {
      if($('#msgbox-'+id).length == 0) {
        var top = $(element).offset().top;
        var right = $(element).offset().right;
        var right = ($(window).width() - ($(element).offset().left + $(element).outerWidth()));
        $("body").append('<div id="msgbox-'+id+'" data-parent=\''+element+'\' class="error-box" style="top: '+top+'px; right: '+right+'px;"> ! </div>');
      }
    }
  },
  msgBoxResize: function(){
    $(window).resize(function() {
      $('div[id^="msgbox-"]').each(function(){
        var element = $(this).attr('data-parent');
        var top = $(element).offset().top;
        var right = $(element).offset().right;
        var right = ($(window).width() - ($(element).offset().left + $(element).outerWidth()));
        $(this).css('top', top);
        $(this).css('right', right);
      });
    });
  }
}

var quote = {
    init: function(){
      var that = this;
      var products = new Array();
      $('.cake > h2').each(function(){
        products.push($(this).html());
      });
      var i = 0;
      $('.cake-quote').each(function(){
        var product = products[i++];
        $(this).click(function(){
          that.doQuote(product);
        })
      });
    },
    doQuote: function(product){
      var txt =  $('textarea');
      var quote = 'Hola, estoy interesado/a en el producto "'+product+'" ';
      if($(txt).val() != ''){
        if(confirm('Al parecer tienes un mensaje escrito en el formulario. Presiona "Aceptar" para sobre-escribir tu mensaje o "Cancelar" para mentener tu mensaje original.')){
          $(txt).focus().val(quote);
          tools.scrollTo('textarea');
        }
      } else {
        $(txt).focus().val(quote);
        tools.scrollTo('textarea');
      }
    }
};

var menu = {
  init: function(){
    var sections = ['business', 'cakes', 'contact'];
    var i = 0;
    $('#site-nav ul li').each(function(){
      var section = sections[i++];
      $(this).click(function(){
        tools.scrollTo('#'+section);
        return false;
      });
    });
  }
};

var contact = {

  user: { name: '', phone: '', email: '', msg: '' },
  init: function(){
    var that = this;
    $('input[type="submit"]').click(function(){
      if(that.checkForm()){
        that.send();
      }
      return false;
    })
  },
  checkForm: function(){
    var valid = true;
    this.user.name = tools.trim($('input[name="name"]').val());
    this.user.phone = tools.trim($('input[name="phone"]').val());
    this.user.email = tools.trim($('input[name="email"]').val());
    this.user.msg = tools.trim($('textarea[name="msg"]').val());
    var user = this.user;
    //Validate
    if(user.name == ''){
      tools.msgBox('input[name="name"]', 'name');
      valid = false;
    } else {
      tools.msgBox('', 'name'); // Remove box
    }
    if(user.email == ''){
        tools.msgBox('input[name="email"]', 'email');
        valid = false;
    } else {
      tools.msgBox('', 'email');
    }
    if (user.msg == ''){
       tools.msgBox('textarea[name="msg"]', 'msg');
       valid = false;
    } else {
      tools.msgBox('', 'msg');
    }
    return valid;
  },
  send: function(){
    var that = this;
    $.ajax({
      dataType: 'jsonp',
      url: "http://getsimpleform.com/messages/ajax?form_api_token=09d5a248cb60ff4582dbe1984e0618bb",
      data: {
        name: that.user.name,
        message: "E-mail: "+that.user.email+"\nTeléfono: "+that.user.phone+"\nMensaje: "+that.user.msg+"\n"
      }
    }).done(function() {
      $('.home-contact').append('<div class="msg-contact">Gracias por contarme. Tu mensaje ha sido enviado.</div>');
      $('#contact-form').fadeOut(function(){
        $('.msg-contact').fadeIn();
      });
    }).error(function(){
      alert('No se ha podido enviar el mensaje. Inténtalo nuevamente.');
    });
  }
}

$(function() {
  quote.init();
  menu.init();
  contact.init();
  tools.msgBoxResize();

  $('.zoom-gallery').magnificPopup({
    delegate: 'a',
    type: 'image',
    closeOnContentClick: false,
    closeBtnInside: false,
    mainClass: 'mfp-with-zoom mfp-img-mobile',
    image: {
      verticalFit: true
    },
    gallery: {
      enabled: true
    }
  });

});