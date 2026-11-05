FROM postgres:18-alpine
RUN apk add --no-cache age rclone curl tzdata
COPY backup.sh restore.sh start.sh /backup/
RUN chmod 755 /backup/*.sh
ENTRYPOINT ["/backup/start.sh"]