# Single Sign-On (SSO)

Single sign-on lets people at your institution sign in to Practera with the account they already use at work or school. Practera supports **Microsoft Entra ID** (formerly Azure AD) and any **SAML 2.0** identity provider.

Navigate to **Institution → Settings → SSO**. The section is visible to institution administrators and Practera CS managers only. The same step-by-step guide is at the top of that page.

![Screenshot](../../assets/placeholder.png)

---

## How it works

1. A person enters their email on the Practera login page.
2. If the email is on one of your **verified domains**, Practera sends them to your identity provider to sign in.
3. They return to Practera signed in. Practera reads their **groups** from your provider and gives them the role you mapped to each group.

Practera never sees their password. Which role someone gets is decided by your **group mappings**, so set those up before the first sign-in.

---

## Before you start

You need:

- Admin access to your identity provider (for Entra: permission to register applications).
- Permission to create a **DNS TXT record** on your email domain, to prove you own it.
- The groups in your provider that should map to Practera roles.

---

## Microsoft Entra ID

Practera connects to Entra with OpenID Connect. The connection is limited to **one Entra tenant**.

### 1. Register the app in Entra

1. In the [Microsoft Entra admin center](https://entra.microsoft.com) open **App registrations → New registration**.
2. Name it (for example "Practera").
3. Under **Supported account types** choose **Accounts in this organizational directory only**.
4. Leave **Redirect URI** empty for now. Practera gives you the value in step 5.
5. Select **Register**.

On the app's **Overview** page, copy the **Application (client) ID** and the **Directory (tenant) ID**.

### 2. Create a client secret

1. Open **Certificates & secrets → New client secret**.
2. Copy the secret **Value** immediately. Entra shows it only once.

!!! warning "Secrets expire"
    Sign-in stops working when the client secret expires. Put the expiry date in a calendar. To rotate, create a new secret in Entra, enter it in **Client secret** on the SSO page and select **Save connection**. Practera never displays a saved secret; it only accepts a replacement.

### 3. Send groups in the token

1. Open **Token configuration → Add groups claim**.
2. Choose **Groups assigned to the application**.
3. For **ID** tokens choose **Group ID**.
4. Open **API permissions** and make sure these delegated permissions are present: `openid`, `profile`, `email`. Select **Grant admin consent**.

Optional: add the `xms_edov` optional claim to the ID token. If Entra reports the email domain as unverified, Practera refuses the sign-in.

!!! note "Large directories"
    Entra leaves the groups out of the token when a person belongs to more than 200 groups. Using **Groups assigned to the application** avoids this and is the recommended setup. If you cannot, turn on **Large directory (more than 200 groups)** on the Practera connection and add the application permission `GroupMember.Read.All` in Entra with admin consent. Practera then looks up group membership through Microsoft Graph.

### 4. Choose who can sign in

1. Open **Enterprise applications**, select your app, then **Users and groups**.
2. Assign the groups that should be able to sign in to Practera.
3. Note each group's **Object Id** (**Groups → the group → Overview**). The group mappings in Practera use these IDs, not the group names.

### 5. Create the connection in Practera

1. In Practera open **Institution → Settings → SSO**.
2. Choose **Microsoft Entra ID (OIDC)**.
3. Enter a display name, your **email domains** (comma separated), the **Directory (tenant) ID**, the **Application (client) ID** and the **client secret**.
4. Select **Create connection**.

Practera now shows a **Redirect URI** under **Connection**. Copy it, then in Entra open **Authentication → Add a platform → Web**, paste it as the Redirect URI and save.

### 6. Verify your email domain

People are only sent to Entra when their email is on a **verified** domain.

1. Under **Domains**, find the domain. Practera shows the **Record name** (`_practera-sso.your-domain`) and **Record value** (`practera-sso=<token>`) for a DNS TXT record.
2. Create the record at your DNS provider.
3. Select **Verify**. DNS changes can take a few minutes. If verification fails, Practera shows the reason.

### 7. Map groups to roles

Under **Group mappings** select **Add mapping** for each Entra group:

| Column | Meaning |
|--------|---------|
| **IdP group** | The group's Object Id (or `*` for everyone else) |
| **Applies to** | The institution, or one experience |
| **Role** | The role the person gets there |

- A row for the **institution** can only give the institution administrator role.
- A row with `*` ("Everyone else") applies only to people who match no other group.
- A person who matches no row and has no `*` row is refused.

Mappings are re-applied on every sign-in, so adding someone to a group gives them access on their next sign-in. **Removing** someone from a group does not remove access they already have. Remove that in Practera.

Select **Save mappings**. Saving replaces the full set of mappings.

### 8. Test it

Open the Practera login page in a private window, enter an email on your verified domain and select **Continue**. You should be sent to Microsoft and return signed in with the role you mapped.

---

## SAML 2.0

Use this for providers other than Entra, or for Entra when you prefer SAML.

1. **Create a SAML application** in your provider. Many providers ask for the Entity ID and ACS URL first. Enter placeholders; you replace them in step 3.
2. **Create the connection in Practera.** Choose **SAML 2.0**, paste the provider's **metadata URL** (or paste its metadata XML), add your email domains and select **Create connection**. Practera pins the signing certificate from the metadata.
3. **Give the provider Practera's values.** Under **Connection** copy these into the provider:
    - **Entity ID (Audience)**: `<login URL>/sso/saml/<connection id>`
    - **ACS URL** (HTTP POST): `<login URL>/sso/saml/<connection id>/acs`
    - **SP metadata URL**: `<login URL>/sso/saml/<connection id>/metadata`
4. **Set the assertion contents** in the provider:
    - NameID format `emailAddress`, or send an `email` or `mail` attribute.
    - **Sign the assertion** (or the response). Unsigned responses are rejected.
    - Send a multi-valued attribute named `groups` with the person's groups.
    - Optional: `givenName`, `surname` or `displayName`.
5. **Verify your domain** and **map groups to roles** as in steps 6 and 7 above. Use the group values exactly as your provider sends them.

!!! tip "Entra as a SAML provider"
    In Entra open **Enterprise applications → New application → Create your own application (non-gallery) → Single sign-on → SAML**. Set Identifier to the Entity ID and Reply URL to the ACS URL. Add a groups claim named `groups` using **Groups assigned to the application** with source attribute **Group ID**.

!!! note "Limits"
    Only sign-in that starts at Practera is supported. Sign-in that starts at the provider (IdP-initiated) and single logout are not. If you rotate the provider's signing certificate, select **Save connection** again (with the new metadata) so Practera pins the new one.

---

## Behaviour settings

| Setting | What it does |
|---------|--------------|
| **Require SSO for these domains** | Blocks email-code and passkey sign-in for verified domains, so those people must use SSO. Needs at least one verified domain. A small set of Practera platform administrators are exempt, so a mistake in your provider settings cannot lock everyone out. |
| **Create accounts on first sign-in** | When on, a person with no Practera account gets one the first time they sign in. When off, only people who already have an account can use SSO. |

!!! tip "Turn on Require SSO last"
    Test with **Require SSO** off first. Turn it on only after a real sign-in has worked end to end.

---

## Troubleshooting

| What the person sees | Likely cause |
|----------------------|--------------|
| "Your account is not set up for this program. Contact your administrator." | They match no group mapping and there is no `*` row. Add a mapping, or check the group Object Id. |
| "Your account has not been created yet. Contact your administrator." | **Create accounts on first sign-in** is off and they have no account yet. |
| "Your email domain is not allowed for this sign-in." | The email's domain is not on a verified domain of this connection. |
| "We could not verify your sign-in with your organisation. Please try again." | The provider's response failed checks (wrong tenant, expired secret, unsigned or replayed SAML response). Check the client secret has not expired and the connection's tenant ID. |
| "Your organisation requires single sign-on." | **Require SSO** is on and they tried the email code or a passkey. They should continue with SSO. |
| Microsoft shows an error about the redirect URI (`AADSTS50011`) | The Redirect URI in Entra does not exactly match the one Practera shows. Copy it again. |
| They are sent to the email code page instead of Microsoft | Their email domain is not verified yet, or does not match a domain on the connection. |

---

## Related pages

- [How to set up SSO](../../how-to/set-up-sso.md): the short end-to-end checklist
- [Integrations](integrations.md): LTI 1.3 and AI keys
- [Institution Detail](overview.md)
