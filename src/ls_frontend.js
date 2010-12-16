/**
 * @file
 * jQuery front-end for the LemonStand platform.
 * ls_frontend re-implements prototypes and methods to match
 * the MooTools AJAX implementation. Credit: stilbuero for $.cookie plugin.
 */

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
		dispose: function(name, options) {
			$.cookie(name, null, options);
		},
		write: function(name, value, options) {
			$.cookie(name, value, options);
		}
	};
	
	window.addEvent = function(name, handler) {
		$(window).bind(name, handler);
	};
	
	$(document).ready(function() {
		$(window).trigger('frontendready');
	});
	
	/**
	 * Delays calling the current function until time has passed.
	 * @type Function
	 * @param time Milliseconds until invoke.
	 * @return none
	 */
	Function.prototype.delay = function(time) {
		setTimeout(this, time);
	};
	
	/**
	 * Serializes the current element into a a key=value format.
	 * @type Function
	 * @return String
	 */
	$.fn.serializeParam = function() {
		var params = {};

		$.each(this.serializeArray(), function(index, value) {
			params[value.name] = value.value;
		});

		return params;
	};

	/**
	 * Returns the parent DOM element of the current element.
	 * @type Function
	 * @return none
	 */
	$.fn.getForm = function() {
		return $(this).parents('form:first');
	};

	/**
	 * Sends a POST request to the back-end.
	 * @type Function
	 * @param Object context Options to customize the request.
	 * @return Boolean
	 */
	$.fn.sendRequest = $.fn.sendPhpr = function(handler, context) {
		this.each(function() {
			var self = $(this);

			var url = self.attr('action');

			context = $.extend(true, {
				form: self,
				ajax: {
					data: self.serializeParam()
				}
			}, context);

			Phpr.sendRequest(url, handler, context);
		});

		return false;
	};
	
	/**
	 * Focuses a field in the current form.
	 * @type Function
	 * @param String field_name Name of the field to focus.
	 * @return none
	 */
	$.fn.focusField = function(field_name) {
		$('[name="' + field_name + '"]').focus();
	};

	/**
	 * Strips and evaulates scripts within a block of text.
	 * @type Function
	 * @param String data The data in which to extract the script.
	 * @param mixed When true, evaluates the script. When a function, calls with the script as an argument.
	 * @return String
	 */
	var stripScripts = function(data, option) {
		var scripts = '';

		var text = data.replace(/<script[^>]*>([^<]*?)<\/script>/gi, function() {
			scripts += arguments[1] + '\n';
			
			return '';
		});

		if (option === true)
			eval(scripts);
		else if (typeof(option) == 'function')
			option(scripts, text);
		
		return text;
	};

	/**
	 * Global reference to the Phpr object.
	 * @type Object
	 */
	window.Phpr = window.LS = {
		response: {
			/**
			 * Shows an alert message.
			 * @type Function
			 * @type none
			 */
			popupError: function() {
				alert(this.html.replace('@AJAX-ERROR@', ''));
			}
		},
		/**
		 * Container of options Phpr uses internally.
		 * @type Object
		 */
		options: {
			form: null,
			handler: false,
			extraFields: {},
			selectorMode: false, // use CSS selectors for partial targeting, rather than element ID
			loadIndicator: {
				show: true,
				hideOnSuccess: true,
				overlayClass: 'ajax_loading_indicator',
				posX: 'center',
				posY: 'center',
				src: null,
				injectInElement: false,
				noImage: false,
				zIndex: 9999,
				element: null,
				absolutePosition: false,
				injectPosition: 'bottom',
				overlayOpacity: 1,
				hideElement: false
			},
			evalResponse: true,
			noLoadingIndicator: false
		},
		
		/**
		 * Sends a POST request to the back-end.
		 * @type Function
		 * @param String url URL to send the request.
		 * @param String handler Handler to invoke with the request.
		 * @param Object context Options to customize the request.
		 * @return none
		 */
		sendRequest: function(url, handler, context) {
			var self = this;
			
			if(self.busy)
				return;

			context = $.extend(true, {
				extraFields: {},
				ajax: {
					url: url,
					data: {
						cms_handler_name: handler,
						cms_update_elements: context && context['update'] ? context['update'] : undefined
					}
				}
			}, context);

			$.extend(context.ajax.data, context.extraFields);

			var response = $.extend({
				/**
				 * Parent object of the request object, which is usually the Phpr object. (defaults to self)
				 * @type Object
				 */
				parent: self,
				
				text: '',
				html: '',
				javascript: '',
				
				/**
				 * Invoked upon completing a failed and successful AJAX request.
				 * @type Function
				 * @return none
				 */
				onComplete: function() {
					var self = this;

					self.parent.busy = false;
					
					if(self.parent.options.loadIndicator.show)
						self.parent.hideLoadingIndicator();
					
					self.html = stripScripts(this.text, function(javascript) {
						self.javascript = javascript;
					});
				},
				
				/**
				 * Invoked upon completing a successful AJAX request. Replaces the selected element with the partial data.
				 * @type Function
				 * @return none
				 */
				onSuccess: function() {
					var self = this;

					var pattern = />>[^<>]*<</g;

					var patches = self.html.match(pattern) || [];

					for(var i = 0, l = patches.length; i < l; ++i) {
						var index = self.html.indexOf(patches[i]) + patches[i].length;

						var html = (i < patches.length-1) ? self.html.slice(index, self.html.indexOf(patches[i+1])) : self.html.slice(index);
	
						var id = patches[i].slice(2, patches[i].length-2);

						if(id) {
							$('#' + id).html(html);
							
							$(window).trigger('onAfterAjaxUpdate', id);
						}
					}

					// if update element is a string, set update element to self.text
					context.update && typeof(context.update) === 'string' && $('#' + context.update).html(self.text);
					console.log(self.javascript);
					eval(self.javascript);
					
					context.onAfterUpdate && context.onAfterUpdate();
					context.onSuccess && context.onSuccess();
				},
				
				/**
				 * Invoked upon completing a failed AJAX request. Creates a popup error.
				 * @type Function
				 * @return none
				 */
				onFailure: function() {
					eval(self.javascript);
					
					this.popupError();
					
					context.onAfterError && context.onAfterError();
					context.onFailure && context.onFailure();
				},
				
				/**
				 * Determines if an AJAX request is successful based on the back-end's response.
				 * @type Function
				 * @return Boolean
				 */
				isSuccess: function() {
					return this.text.search("@AJAX-ERROR@") == -1;
				}
			}, Phpr.response);
			
			if(context.preCheckFunction && !context.preCheckFunction())
				return;
				
			if(context.alert)
				return alert(context.alert);
			
			if(context.confirm && !confirm(context.confirm))
				return;
				
			if(context.postCheckFunction && !context.postCheckFunction())
				return;
			
			var request = $.extend({
				beforeSend: function(xhr) {
					xhr.setRequestHeader('PHPR-REMOTE-EVENT', '1');
					xhr.setRequestHeader('PHPR-POSTBACK', '1');
					xhr.setRequestHeader('PHPR-EVENT-HANDLER', 'ev{onHandleRequest}');
				},
				type: 'POST',
				failure: function(data) {
					response.text = data;
					
					response.onComplete();
					response.onFailure();
				},
				success: function(data) {
					response.text = data;
					
					response.onComplete();
					
					response.isSuccess() ? response.onSuccess() : response.onFailure();
				}
			}, context.ajax);

			if(self.options.loadIndicator.show)
				self.showLoadingIndicator();

			context.prepareFunction && context.prepareFunction();
			context.onBeforePost && context.onBeforePost();
			
			self.busy = true;
			$.ajax(request);
		},
		
		/**
		 * Shows the loading indicator.
		 * @type Function
		 * @return none
		 */
		showLoadingIndicator: function() {
			var self = this;
			
			var options = $.extend(true, {}, self.options.loadIndicator);
			
			var container = options.injectInElement && options.form ? options.form : $('body');
			var position = options.absolutePosition ? 'absolute' : 'fixed';
			var visibility = options.hideElement ? 'hidden' : 'visible';
			
			if(self.loadingIndicator === null) {
				var element = options.element ? $('#' + options.element) : $('<p />');
				
				self.loadingIndicator = element
					.css({
						visibility: visibility,
						position: position,
						opacity: options.overlayOpacity,
						zIndex: options.zIndex
					})
					.addClass(options.overlayClass)
					.html("<span>Loading...</span>")
					.prependTo(container);
			}
			
			self.loadingIndicator.show();
		},
		
		/**
		 * Hides the loading indicator.
		 * @type Function
		 * @return none
		 */
		hideLoadingIndicator: function() {
			self.loadingIndicator = this.loadingIndicator.remove();
		},
		
		/**
		 * Contains the element used as the loading indicator. (defaults to null)
		 * @type Object
		 */
		loadingIndicator: null,
		
		busy: false
	};
})(jQuery);