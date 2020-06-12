FROM nginx
RUN rm /usr/share/nginx/html/*
COPY html /usr/share/nginx/html
