FROM nginx:1.15.11-alpine
COPY dist /usr/share/nginx/html
#使用自定义nginx.conf配置端口和监听
COPY nginx.conf /etc/nginx/nginx.conf

RUN /bin/bash -c 'echo init ok!!!'