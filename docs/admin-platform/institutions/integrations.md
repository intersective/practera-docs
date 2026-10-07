# Integrations

Connect Practera to your Learning Management System or enable AI-powered feedback using the Integrations settings at the institution level.

Navigate to **Institution Menu → Settings → Integrations** to configure external tool connections.

Looking for single sign-on with Microsoft Entra ID or SAML? See [Single Sign-On](sso.md).

![Screenshot](../../assets/placeholder.png)

---

## LTI 1.3

Practera supports **LTI 1.3** (the current standard), which allows your LMS to launch Practera activities directly — with single sign-on and grade passback.

### Supported LMS platforms

- Canvas (Instructure)
- Moodle
- Blackboard Ultra
- D2L Brightspace
- Any LTI 1.3-compliant platform

### Manual LTI registration

1. Go to **Institution → Settings → Integrations → LTI 1.3**.
2. Click **Add Registration**.
3. Copy the **Tool URL**, **Client ID**, **JWKS URL**, and **Redirect URL** from Practera.
4. In your LMS, create a new External Tool with these values.
5. Once registered, the new platform appears in the LTI Registrations list.

### Dynamic registration (supported LMS only)

Some platforms (Moodle 4+, Canvas with dynamic registration enabled) support one-click registration:

1. Copy the **Dynamic Registration URL** from the Integrations page.
2. Paste it into your LMS's "Add LTI Tool → Dynamic Registration" field.
3. Confirm the tool details in your LMS — no manual copy/paste required.

!!! tip "Testing LTI"
    Use the local LTI Simulator (available in the Practera DevOps Center) to test your LTI configuration before rolling it out to learners.

---

## AI API Keys

Practera's AI feedback features use language models to provide learners with instant, personalised feedback on their submissions. By default, Practera uses the platform's shared API key. For higher volume or custom models, you can supply your own.

### Supported providers

| Provider | Models available |
|----------|-----------------|
| **OpenAI** | GPT-4o, GPT-4o Mini |
| **Anthropic** | Claude Sonnet 4, Claude Haiku |
| **AWS Bedrock** | Claude via Bedrock (enterprise only) |

### Adding an API key

1. Navigate to **Institution → Settings → Integrations → AI API Keys**.
2. Select the provider from the dropdown.
3. Paste your API key.
4. Click **Save**.

!!! warning "Key security"
    API keys are stored encrypted. Never share your key or include it in screenshots. If a key is compromised, rotate it immediately and update the value here.

!!! note "Per-experience AI configuration"
    Once the institution key is set, coordinators can select the model for each AI Expert configured under Institution → Library → AI Experts.

---

## Webhooks (Coming in v2.7)

Outgoing webhooks will allow Practera to push events (submissions, enrolments, completions) to your external systems in real time. Configuration will be available under **Institution → Settings → Integrations → Webhooks** in v2.7.

---

## Related

- [Branding your institution](branding.md)
- [Institution overview](overview.md)
- [LTI embedding guides](../../help-articles/integrations/index.md) (Help Center)
