;;; -*- lexical-binding: t -*-

(require 'elnode-proxy)
(require 'elnode-js)

(defconst gnudoc/docroot (expand-file-name "gnudoc-webapp"))

(defun gnudoc-ws (httpcon)
  (let ((elnode-send-file-assoc
         '(("\\.js$" . elnode-js/browserify-send-func))))
    (elnode--webserver-handler-proc
     httpcon gnudoc/docroot elnode-webserver-extra-mimetypes)))

(defun gnudoc-info (httpcon)
  "Just send the main app page."
  (elnode-send-file httpcon (expand-file-name "index.html" gnudoc/docroot)))

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
     ("^[^.]+//.*" . gnudoc-ws))))

(elnode-start
 'gnudoc-handler
 :port 8015
 ;; setting the host specifically although elnode should really use a
 ;; default of elnode-init-host
 :host "0.0.0.0") 

;;; gnudoc.el ends here
