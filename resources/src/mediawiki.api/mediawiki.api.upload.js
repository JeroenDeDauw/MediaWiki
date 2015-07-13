/**
 * Provides an interface for uploading files to MediaWiki.
 * @class mw.Api.plugin.upload
 * @singleton
 */
( function ( mw, $ ) {
	var nonce = 0,
		fieldsAllowed = {
			filename: true,
			comment: true,
			text: true,
			watchlist: true,
			ignorewarnings: true
		};

	/**
	 * @private
	 * Get nonce for iframe IDs on the page.
	 * @return {number}
	 */
	function getNonce() {
		return nonce++;
	}

	/**
	 * @private
	 * Get new iframe object for an upload.
	 * @return {HTMLIframeElement}
	 */
	function getNewIframe( id ) {
		var frame = document.createElement( 'iframe' );
		frame.id = id;
		frame.name = id;
		return frame;
	}

	/**
	 * @private
	 * Shortcut for getting hidden inputs
	 * @return {jQuery}
	 */
	function getHiddenInput( name, val ) {
		return $( '<input type="hidden" />')
			.attr( 'name', name )
			.val( val );
	}

	/**
	 * Parse response from an XHR to the server.
	 * @private
	 * @param {Event} e
	 * @return {Object}
	 */
	function parseXHRResponse( e ) {
		var response;

		try {
			response = $.parseJSON( e.target.responseText );
		} catch ( error ) {
			response = {
				error: {
					code: e.target.code,
					info: e.target.responseText
				}
			};
		}

		return response;
	}

	/**
	 * Process the result of the form submission, returned to an iframe.
	 * This is the iframe's onload event.
	 *
	 * @param {HTMLIframeElement} iframe Iframe to extract result from
	 * @return {Object} Response from the server. The return value may or may
	 *   not be an XMLDocument, this code was copied from elsewhere, so if you
	 *   see an unexpected return type, please file a bug.
	 */
	function processIframeResult( iframe ) {
		var json,
			doc = iframe.contentDocument || frames[iframe.id].document;

		if ( doc.XMLDocument ) {
			// The response is a document property in IE
			return doc.XMLDocument;
		}

		if ( doc.body ) {
			// Get the json string
			// We're actually searching through an HTML doc here --
			// according to mdale we need to do this
			// because IE does not load JSON properly in an iframe
			json = $( doc.body ).find( 'pre' ).text();

			return JSON.parse( json );
		}

		// Response is a xml document
		return doc;
	}

	function formDataAvailable() {
		return window.FormData !== undefined &&
			window.File !== undefined &&
			window.File.prototype.slice !== undefined;
	}

	$.extend( mw.Api.prototype, {
		/**
		 * Upload a file to MediaWiki.
		 * @param {HTMLInputElement|File} file HTML input type=file element with a file already inside of it, or a File object.
		 * @param {Object} data Other upload options, see action=upload API docs for more
		 * @return {jQuery.Promise}
		 */
		upload: function ( file, data ) {
			var iframe, formData;

			if ( !file ) {
				return $.Deferred().reject( 'No file' );
			}

			iframe = file.nodeType && file.nodeType === file.ELEMENT_NODE;
			formData = formDataAvailable() && file instanceof window.File;

			if ( !iframe && !formData ) {
				return $.Deferred().reject( 'Unsupported argument type passed to mw.Api.upload' );
			}

			if ( formData ) {
				return this.uploadWithFormData( file, data );
			}

			return this.uploadWithIframe( file, data );
		},

		/**
		 * Upload a file to MediaWiki with an iframe and a form.
		 *
		 * This method is necessary for browsers without the File/FormData
		 * APIs, and continues to work in browsers with those APIs.
		 *
		 * The rough sketch of how this method works is as follows:
		 * * An iframe is loaded with no content.
		 * * A form is submitted with the passed-in file input and some extras.
		 * * The MediaWiki API receives that form data, and sends back a response.
		 * * The response is sent to the iframe, because we set target=(iframe id)
		 * * The response is parsed out of the iframe's document, and passed back
		 *   through the promise.
		 * @param {HTMLInputElement} file The file input with a file in it.
		 * @param {Object} data Other upload options, see action=upload API docs for more
		 * @return {jQuery.Promise}
		 */
		uploadWithIframe: function ( file, data ) {
			var tokenPromise,
				api = this,
				filenameFound = false,
				deferred = $.Deferred(),
				nonce = getNonce(),
				id = 'uploadframe-' + nonce,
				$form = $( '<form>' ),
				iframe = getNewIframe( id ),
				$iframe = $( iframe );

			$form.addClass( 'mw-api-upload-form' );

			$form.append(
				getHiddenInput( 'action', 'upload' ),
				getHiddenInput( 'format', 'json' ),
				file
			);

			$form.css( 'display', 'none' )
				.attr( {
					action: this.defaults.ajax.url,
					method: 'POST',
					target: id,
					enctype: 'multipart/form-data'
				} );

			$iframe.one( 'load', function () {
				$iframe.one( 'load', function () {
					var result = processIframeResult( iframe );

					if ( !result ) {
						deferred.reject( 'No response from API on upload attempt.' );
					} else if ( result.error || result.warnings ) {
						if ( result.error && result.error.code === 'badtoken' ) {
							api.badToken( 'edit' );
						}

						deferred.reject( result.error || result.warnings );
					} else {
						deferred.notify( 1 );
						deferred.resolve( result );
					}
				} );
				tokenPromise.done( function () {
					$form.submit();
				} );
			} );

			$iframe.error( function ( error ) {
				deferred.reject( 'iframe failed to load: ' + error );
			} );

			$iframe.prop( 'src', 'about:blank' ).hide();

			file.name = 'file';

			$.each( data, function ( key, val ) {
				if ( key === 'filename' ) {
					filenameFound = true;
				}

				if ( fieldsAllowed[key] === true ) {
					$form.append( getHiddenInput( key, val ) );
				}
			} );

			if ( !filenameFound ) {
				return $.Deferred().reject( 'Filename not included in file data.' );
			}

			tokenPromise = this.getEditToken().then( function ( token ) {
				$form.append( getHiddenInput( 'token', token ) );
			} );

			$( 'body' ).append( $form, $iframe );

			return deferred.promise();
		},

		/**
		 * Uploads a file using the FormData API.
		 * @param {File} file
		 * @param {Object} data
		 */
		uploadWithFormData: function ( file, data ) {
			var xhr, tokenPromise,
				api = this,
				formData = new FormData(),
				deferred = $.Deferred(),
				filenameFound = false;

			formData.append( 'action', 'upload' );
			formData.append( 'format', 'json' );

			$.each( data, function ( key, val ) {
				if ( key === 'filename' ) {
					filenameFound = true;
				}

				if ( fieldsAllowed[key] === true ) {
					formData.append( key, val );
				}
			} );

			if ( !filenameFound ) {
				return $.Deferred().reject( 'Filename not included in file data.' );
			}

			formData.append( 'file', file );

			xhr = new XMLHttpRequest();

			xhr.upload.addEventListener( 'progress', function ( e ) {
				if ( e.lengthComputable ) {
					deferred.notify( e.loaded / e.total );
				}
			}, false );

			xhr.addEventListener( 'abort', function ( e ) {
				deferred.reject( parseXHRResponse( e ) );
			}, false );

			xhr.addEventListener( 'load', function ( e ) {
				deferred.resolve( parseXHRResponse( e ) );
			}, false );

			xhr.addEventListener( 'error', function ( e ) {
				deferred.reject( parseXHRResponse( e ) );
			}, false );

			xhr.open( 'POST', this.defaults.ajax.url, true );

			tokenPromise = this.getEditToken().then( function ( token ) {
				formData.append( 'token', token );
				xhr.send( formData );
			}, function () {
				// Mark the edit token as bad, it's been used.
				api.badToken( 'edit' );
			} );

			return deferred.promise();
		}
	} );

	/**
	 * @class mw.Api
	 * @mixins mw.Api.plugin.upload
	 */
}( mediaWiki, jQuery ) );
