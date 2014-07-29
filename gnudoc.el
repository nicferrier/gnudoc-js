

(require 'elnode-proxy)

(defconst gnudoc/docroot (expand-file-name "docroot"))

(defun gnudoc-ws (httpcon)
  (let ((elnode-send-file-assoc
         '(("\\.js$" . elnode-js/browserify-send-func))))
    (elnode--webserver-handler-proc
     httpcon gnudoc/docroot elnode-webserver-extra-mimetypes)))

(defun gnudoc-prox (httpcon)
  (let ((url
         (format
          "http://www.gnu.org/software/emacs/manual/html_node/elisp/%s"
          (save-match-data
            (let ((pi (elnode-http-pathinfo httpcon)))
              (string-match "/manual/elisp/\\(.*\\)" pi)
              (match-string 1 pi))))))
    (elnode-proxy-do httpcon url)))

(defun gnudoc-handler (httpcon)
  "Do a sexy js enabled GNU doc."
  (elnode-hostpath-dispatcher
   httpcon
   `(("^[^/]+//manual/.*" . gnudoc-prox)
     ("^[^.]+//.*" . gnudoc-ws))))

(elnode-start 'gnudoc-handler :port 8015)

