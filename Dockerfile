FROM octohost/nodejs

ENV PORT 3000

ADD . /srv/www

WORKDIR /srv/www

RUN npm install --unsafe-perm

EXPOSE 3000

CMD ./bin/slackin --channels "$SLACK_CHANNELS" --port $PORT $SLACK_SUBDOMAIN $SLACK_API_TOKEN $MAILCHIMP_DATACENTER $MAILCHIMP_API_KEY $MAILCHIMP_LIST_ID
