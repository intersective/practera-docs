# How to test SSO

**Who this is for:** Practera developers and QA (developer docs; the customer-facing guide is [How to set up SSO](https://support.practera.com/how-to/set-up-sso/)). This covers the local stack (a real Keycloak identity provider, no mocks) and a real Microsoft Entra test tenant.

## Test locally with Keycloak

The local stack includes `practera-keycloak`, a real SAML 2.0 and OIDC identity provider. Its realm (`practera`) is imported from `stack/keycloak/practera-realm.json` in `practera-devops-center`.

### 1. Start the stack and seed the connections

1. Start the stack from the `practera` TUI, with Keycloak selected under **Dev Tools**. Postgres, LocalStack and login-api must also be running.
2. Run the seed script once (safe to re-run):

    ```bash
    stack/scripts/seed-sso.sh
    ```

    It creates two connections on the **Local Development** institution and maps the Keycloak groups to roles:

    | Connection | Email domain | Connection id |
    |------------|--------------|---------------|
    | OIDC | `idp.practera.test` | `4f1d0000-0000-4000-8000-0000000000a1` |
    | SAML | `saml.practera.test` | `4f1d0000-0000-4000-8000-0000000000a2` |

    | Keycloak group | Role |
    |----------------|------|
    | `practera-learners` | participant |
    | `practera-mentors` | mentor |
    | `practera-coordinators` | coordinator |
    | `practera-inst-admins` | institution administrator |

3. To sign in from a real browser, add the hosts entries once (`sso.practera.local` is the identity provider's address):

    ```bash
    bash stack/scripts/setup-hosts.sh
    ```

### 2. Sign in with a test user

Open `https://login.practera.local`, enter a test user's email and press Continue. You go to Keycloak, sign in, and return signed in.

The password is the value of `SSO_TEST_PASSWORD` in `stack/.env`. It is a local test value only.

| Email | Group | Expect |
|-------|-------|--------|
| `learner@idp.practera.test` | learners | Signed in as a participant (OIDC) |
| `mentor@idp.practera.test` | mentors | Signed in as a mentor (OIDC) |
| `coordinator@idp.practera.test` | coordinators | Signed in as a coordinator (OIDC) |
| `instadmin@idp.practera.test` | inst-admins | Signed in as institution administrator (OIDC) |
| `nogroup@idp.practera.test` | none | Refused: "Your account is not set up for this program" |
| `foreign@other.example` | learners | Not sent to SSO: the domain is not on a verified connection |
| `learner@saml.practera.test` | learners | Signed in as a participant (SAML) |
| `coordinator@saml.practera.test` | coordinators | Signed in as a coordinator (SAML) |
| `instadmin@saml.practera.test` | inst-admins | Signed in as institution administrator (SAML) |
| `nogroup@saml.practera.test` | none | Refused (SAML) |

The email domain picks the connection: `@idp.practera.test` uses OIDC and `@saml.practera.test` uses SAML.

### 3. Add your own test user or group

1. Open the Keycloak admin console from the **Dev Tools** section of the test dashboard (**Keycloak Admin**). Use the admin credentials set for the `practera-keycloak` service in `stack/docker-compose.yml`.
2. Make sure the **practera** realm is selected, then **Users → Add user**.
3. Set the email to an address ending in `@idp.practera.test` or `@saml.practera.test`. Those are the verified domains on the seeded connections.
4. Under **Credentials** set a password with **Temporary** off. Under **Groups** join one of the `practera-*` groups.

Changes made in the console last as long as the Keycloak data does. To keep a user permanently, add it to `stack/keycloak/practera-realm.json`. The file is imported only when Keycloak starts with an empty data volume.

### 4. Run the automated checks

| What | Command | Where |
|------|---------|-------|
| login-api against real Keycloak | `npm run test:sso` | `practera-login-api` |
| Integration flows 8 (OIDC), 9 (SAML) and 10 (identity binding) | `practera-test integration --env local` | `practera-test-suite` |
| Browser sign-in through the real login page | `npm run test:regression:sso` | `practera-test-suite/suites/regression`, inside the `practera-playwright` container |

The system tests skip with a warning if the stack is down. Flows 8 to 10 need the seed script to have run.

Browsers run in containers, never on your host: use `docker exec` into `practera-playwright` for the browser test.

## Test with Microsoft Entra ID

Keycloak does not cover Entra's own behaviour (group IDs, the groups claim, large directories), so test those against a dedicated Entra tenant. Never use a customer tenant.

1. In the test tenant, follow [How to set up SSO](https://support.practera.com/how-to/set-up-sso/) for Entra. Create test users and groups, and note each group's **Object Id**.
2. Keep the secrets in the environment only, never in code or chat. The test suite reads `SSO_ENTRA_TENANT_ID`, `SSO_ENTRA_CLIENT_ID`, `SSO_ENTRA_CLIENT_SECRET`, `SSO_ENTRA_TEST_USER`, `SSO_ENTRA_TEST_PASSWORD` and `SSO_ENTRA_GROUP_LEARNER`.
3. Entra requires an `https` Redirect URI (except for `http://localhost`). Use the redirect URI of an `https` stack, such as stage.
4. Run `practera-test integration --env stage`. The Entra flow runs when those variables are set and skips with a message when they are not.

## Related

- [How to set up SSO (customer guide)](https://support.practera.com/how-to/set-up-sso/)
- [Single Sign-On reference](https://support.practera.com/admin-platform/institutions/sso/)
