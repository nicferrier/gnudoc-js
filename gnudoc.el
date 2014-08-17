;;; -*- lexical-binding: t -*-

(require 'elnode-proxy)
(require 'elnode-js)

(defconst gnudoc/docroot (expand-file-name "gnudoc-webapp"))

(defmacro gnudoc/etag (httpcon &rest body)
  "A macro to implement the Etag cache algorithm."
  (declare (debug (sexp &rest form))
           (indent 1))
  `(let ((etag-check (or (elnode-http-header httpcon 'if-none-match) "NONE"))
         (etag (when (getenv "ETAG")
                 (sha1 (concat (getenv "ETAG") (elnode-http-pathinfo httpcon))))))
     (if (equal etag-check etag)
         (elnode-cached httpcon)
         ,@body)))

(defun gnudoc-ws (httpcon)
  "Override the webserver to do Etag caching and browserify."
  (let ((elnode-send-file-assoc
         '(("\\.js$" . elnode-js/browserify-send-func))))
    (gnudoc/etag httpcon
      (when etag (elnode-http-header-set httpcon "Etag" etag))
      (elnode--webserver-handler-proc
       httpcon gnudoc/docroot elnode-webserver-extra-mimetypes))))

(defun gnudoc-info (httpcon)
  "Just send the main app page."
  (gnudoc/etag httpcon
    (elnode-send-file httpcon (expand-file-name "index.html" gnudoc/docroot))))

;; this is the emacs manual url
;; "http://www.gnu.org/software/emacs/manual/html_node/emacs/index.html"

(defun gnudoc-prox (httpcon)
  (let ((url
         (format
          "http://www.gnu.org/software/emacs/manual/html_node/elisp/%s"
          (save-match-data
            (let ((pi (elnode-http-pathinfo httpcon)))
              (string-match "/manual/elisp/\\(.*\\)" pi)
              (match-string 1 pi))))))
    (elnode-proxy-do
     httpcon url
     :header-filter
     (lambda (web-url headers)
       (let ((far-off
              (elnode-rfc1123-date
               (time-add
                (seconds-to-time (* 60 60 24 5))
                (current-time))))
             (expires-hdr (assoc 'expires headers)))
         (when expires-hdr (setf (cdr expires-hdr) far-off))
         (-filter (lambda (header-cons)
                    (unless (eq (car header-cons) 'cache-control)
                      header-cons))
                headers))))))

(defun gnudoc-handler (httpcon)
  "Do a sexy js enabled GNU doc."
  (elnode-hostpath-dispatcher
   httpcon
   `(("^[^/]+//manual/.*" . gnudoc-prox)
     ("^[^/]+//info/.*" . gnudoc-info)
     ("^[^/]+//.*" . gnudoc-ws))))

(elnode-start
 'gnudoc-handler
 :port 8015
 ;; setting the host specifically although elnode should really use a
 ;; default of elnode-init-host
 :host "0.0.0.0") 

;;; gnudoc.el ends here
