# How to set up SSO

**Who this is for:** institution administrators. You need the institution administrator role (or be a Practera CS manager) in Practera, admin access to your identity provider, and permission to add a DNS record on your email domain.

**What you get:** people with an email on your domain sign in with their organisation account, and Practera gives each person a role from their directory groups.

## Steps

1. **Decide your groups.** List the directory groups that should get access, and what each should be in Practera (institution administrator, or a role on a particular experience). Groups can be mapped later, but have the list ready.
2. **Choose your provider.**
    - Microsoft Entra ID: follow [Microsoft Entra ID](../admin-platform/institutions/sso.md#microsoft-entra-id).
    - Any other SAML 2.0 provider: follow [SAML 2.0](../admin-platform/institutions/sso.md#saml-20).
3. **Open the SSO page.** In Practera go to **Institution → Settings → SSO**. A step-by-step guide at the top shows the same steps, with this connection's Redirect URI or Entity ID and ACS URL filled in once the connection exists.
4. **Create the connection**, then copy Practera's values (Redirect URI for Entra; Entity ID and ACS URL for SAML) into your provider.
5. **Verify your email domain** with the DNS TXT record shown on the page.
6. **Map groups to roles.** A person who matches no mapping, and no `*` row, is refused.
7. **Test with one real account** in a private window, with **Require SSO** still off.
8. **Turn on Require SSO** (optional) once a sign-in has worked end to end. People on your domain then cannot use the email code or a passkey.

## Check it worked

- The person is sent to your provider from the Practera login page, and returns signed in.
- Their role matches the group mapping.
- A person in no mapped group sees "Your account is not set up for this program. Contact your administrator."

## If it doesn't

See [Troubleshooting](../admin-platform/institutions/sso.md#troubleshooting).

## Related

- [Single Sign-On reference](../admin-platform/institutions/sso.md)
