(function($) {
  jQuery.cookie = function(name, value, options) {
      if (typeof value != 'undefined') { // name and value given, set cookie
          options = options || {};
          if (value === null) {
              value = '';
              options.expires = -1;
          }
          var expires = '';
          if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
              var date;
              if (typeof options.expires == 'number') {
                  date = new Date();
                  date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
              } else {
                  date = options.expires;
              }
              expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
          }
          // CAUTION: Needed to parenthesize options.path and options.domain
          // in the following expressions, otherwise they evaluate to undefined
          // in the packed version for some reason...
          var path = options.path ? '; path=' + (options.path) : '';
          var domain = options.domain ? '; domain=' + (options.domain) : '';
          var secure = options.secure ? '; secure' : '';
          document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
      } else { // only name given, get cookie
          var cookieValue = null;
          if (document.cookie && document.cookie != '') {
              var cookies = document.cookie.split(';');
              for (var i = 0; i < cookies.length; i++) {
                  var cookie = jQuery.trim(cookies[i]);
                  // Does this cookie string begin with the name we want?
                  if (cookie.substring(0, name.length + 1) == (name + '=')) {
                      cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                      break;
                  }
              }
          }
          return cookieValue;
      }
  };
  
  window.Cookie = {
    dispose: function() {
      $.cookie(name, null);
    },
    write: function(name, value, options) {
      $.cookie(name, value, options);
    }
  };
  
  Function.prototype.delay = function(time) {
    setTimeout(this, time);
  };
  
  $.fn.serializeParam = function() {
    var params = {};

    $.each(this.serializeArray(), function(index, value) {
      if(params[value.name])
        params[value.name] = [params[value.name], value.value];
      else
        params[value.name] = value.value;
    });

    return params;
  };

  $.fn.getForm = function() {
    return $(this).parents('form:first');
  };

  $.fn.sendRequest = function(handler, context) {
    this.each(function() {
      var self = $(this);

      var url = self.attr('action');

      context = $.extend(true, {
        ajax: {
          data: self.serializeParam()
        }
      }, context);

      $.Phpr.sendRequest(url, handler, context);
    });

    return false;
  };
  
  $.fn.focusField = function(field_name) {
    $('[name="' + field_name + '"]').focus();
  };

  var strip_scripts = function(data, option) {
    var scripts = '';

    var text = data.replace(/<script[^>]*>([^<]*?)<\/script>/gi, function() {
      scripts += arguments[1] + '\n';
      
      return '';
    });

    if (option === true) eval(scripts);
    else if (typeof(option) == 'function') option(scripts, text);
    
    return text;
  };

  $.Phpr = {
    options: {
      handler: false,
      extraFields: {},
      selectorMode: false, // use CSS selectors for partial targeting, rather than element ID
      loadingIndicator: {
        show: true,
        hideOnSuccess: true,
        overlayClass: 'ajax_loading_indicator',
        posX: 'center',
        posY: 'center',
        src: null,
        injectInElement: false,
        noImage: false,
        zIndex: 9999,
        absolutePosition: true,
        injectPosition: 'bottom',
        overlayOpacity: 1,
        hideElement: true
      },
      evalResponse: true,
      noLoadingIndicator: false
    },
    
    request: {
      parent: null,
      response: {
        text: '',
        html: '',
        javascript: ''
      },
      onComplete: function() {
        var self = this;
        
        if(self.parent.options.loadingIndicator.show)
          self.parent.hideLoadingIndicator();
        
        self.response.html = strip_scripts(this.response.text, function(javascript) {
          self.response.javascript = javascript;
        });
        
        eval(self.response.javascript);
      },
      onSuccess: function() {
        var self = this;
        
        var pattern = />>[^<>]*<</g;

        var patches = self.response.html.match(pattern) || [];

        for(var i = 0, l = patches.length; i < l; ++i) {
          var index = self.response.html.indexOf(patches[i]) + patches[i].length;

          var html = (i < patches.length-1) ? self.response.html.slice(index, self.response.html.indexOf(patches[i+1])) : self.response.html.slice(index);

          var id = patches[i].slice(2, patches[i].length-2);

          $('#' + id).html(html);
        }
      },
      onFailure: function(data) {
        this.popupError();
      },
      isSuccess: function() {
        return this.response.text.search("@AJAX-ERROR@") == -1;
      },
      popupError: function() {
        alert(this.response.html.replace('@AJAX-ERROR@', ''));
      }
    },
    sendPhpr: function(url, handler, context) {
      var self = this;

      context = $.extend(true, {
        extraFields: {},
        onAfterUpdate: function() {},
        ajax: {
          url: url,
          data: {
            cms_handler_name: handler,
            cms_update_elements: context && context['update'] ? context['update'] : {}
          }
        }
      }, context);

      $.extend(context.ajax.data, context.extraFields);

      var request = $.extend({
        beforeSend: function(xhr) {
          xhr.setRequestHeader('PHPR-REMOTE-EVENT', '1');
          xhr.setRequestHeader('PHPR-POSTBACK', '1');
          xhr.setRequestHeader('PHPR-EVENT-HANDLER', 'ev{onHandleRequest}');
        },
        type: 'POST',
        failure: function(data) {
          var request = $.extend({}, self.request);
          request.response.text = data;
          
          request.onComplete();
          request.onFailure();
        },
        success: function(data) {
          var request = $.extend({}, self.request);
          request.parent = self;
          request.response.text = data;
          
          request.onComplete();
          
          if(request.isSuccess())
            request.onSuccess();
          else
            request.onFailure();
          
          context.onAfterUpdate();
        }
      }, context.ajax);

      if(self.options.loadingIndicator.show)
        self.showLoadingIndicator();

      $.ajax(request);
    },
    
    sendRequest: function() {
      this.sendPhpr.apply(this, arguments);
    },
    
    showLoadingIndicator: function() {
      var self = this;
      
      var options = $.extend(true, {}, self.options.loadingIndicator);
      
      var container = options.injectInElement ? $('#content') : $('body');
      //var position = options.absolutePosition ? 'absolute' : 'static';
      var visibility = options.hideElement ? 'hidden' : 'visible';
      
      if(self.loadingIndicator === null) {
        self.loadingIndicator = $('<p />')
          .css({
            //visibility: visibility,
            //position: position,
            opacity: options.overlayOpacity,
            zIndex: options.zIndex
          })
          .addClass(options.overlayClass)
          .html("<span>Loading...</span>")
          .appendTo(container);
      }
      
      self.loadingIndicator.show();
    },
    
    hideLoadingIndicator: function() {
      this.loadingIndicator.hide();
    },
    
    loadingIndicator: null
  };
})(jQuery);
