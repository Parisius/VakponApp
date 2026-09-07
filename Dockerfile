# Serves site/, admin/, and espace-client/ from one Nginx container, for
# use behind a reverse proxy that only speaks host:port (e.g. Nginx Proxy
# Manager) rather than sharing a Docker network with this container.
#
# The admin/ folder is intentionally published at /management/ — the repo
# folder itself stays "admin" (matching local dev tooling: npx serve admin),
# only its public URL differs.
FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
COPY admin/ /usr/share/nginx/html/management/
COPY espace-client/ /usr/share/nginx/html/espace-client/
COPY deploy/nginx-frontend.conf /etc/nginx/conf.d/default.conf
# Some source files carry restrictive (600) permissions from outside this repo's
# history — normalize so the non-root nginx worker process can actually read them.
RUN chmod -R a+rX /usr/share/nginx/html
EXPOSE 80
