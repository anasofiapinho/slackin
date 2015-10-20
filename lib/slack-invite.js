
import request from 'superagent';
import md5 from 'js-md5';

export default function invite({ org, token, email, mailchimp_datacenter, mailchimp_api_key, mailchimp_list_id, channel }, fn){
  let slack_data = { email, token };

  if (channel) {
    slack_data.channels = channel;
    slack_data.ultra_restricted = 1;
    slack_data.set_active = true;
  }

  // 0. Get md5 hash of email
  let hashed_email = md5(email);
  // 1. request.get mailchimp subscription status
  // https://<mailchimp_datacenter>.api.mailchimp.com/3.0/lists/<mailchimp_list_id>/members/<hashed_email>

  request
    .get(`https://${mailchimp_datacenter}.api.mailchimp.com/3.0/lists/${mailchimp_list_id}/members/${hashed_email}`)
    .auth('slackin', mailchimp_api_key)
    .end((err, res) => {
      // 2. if not successful or not subscribed, return an error
      if (err) return fn(err);
      if (404 == res.status) {
        fn(new Error('You are not a member of the Twin Cities Geekettes community. Be sure to sign up to be a member <a href="http://www.geekettes.io/membership">here</a> first and then confirm your email subscription.'));
        return;
      }
      if (200 != res.status) {
        fn(new Error(`Invalid response ${res.status}.`));
        return;
      }
      if (res.body.status == "pending") {
        fn(new Error('You have requested membership to the Twin Cities Geekettes community, however you have not confirmed your email subscription. You must have be subscribed to the email list to gain access to the Slack community. Check your email for a confirmation or sign up <a href="http://www.geekettes.io/membership">here</a>.'));
        return;
      }

      if (res.body.status == "unsubscribed" || res.body.status == "cleaned") {
        fn(new Error('Your email has been removed from the Twin Cities Geekettes email list (because it bounced or you unsubscribed). You must have be subscribed to the email list to gain access to the Slack community. You can sign up <a href="http://www.geekettes.io/membership">here</a>.'));
        return;
      }

      // 3. if successful and subscribed, invite
      request
        .post(`https://${org}.slack.com/api/users.admin.invite`)
        .type('form')
        .send(slack_data)
        .end(function(err, res){
          if (err) return fn(err);
          if (200 != res.status) {
            fn(new Error(`Invalid response ${res.status}.`));
            return;
          }

          // If the account that owns the token is not admin, Slack will oddly
          // return `200 OK`, and provide other information in the body. So we
          // need to check for the correct account scope and call the callback
          // with an error if it's not high enough.
          let {ok, error: providedError, needed} = res.body;
          if (!ok) {
            if (providedError === 'missing_scope' && needed === 'admin') {
              fn(new Error(`Missing admin scope: The token you provided is for an account that is not an admin. You must provide a token from an admin account in order to invite users through the Slack API.`));
            } else if (providedError === 'already_invited') {
              fn(new Error('You have already been invited to slack. Check for an email from feedback@slack.com.'));
            } else if (providedError === 'already_in_team') {
              fn(new Error(`Already invited. Sign in at <a href="https://${org}.slack.com">https://${org}.slack.com</a>.`));
            } else {
              fn(new Error(providedError));
            }
            return;
          }

          fn(null);
        });

    });

}
