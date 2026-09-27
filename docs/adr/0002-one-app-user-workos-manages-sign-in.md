# One App user; WorkOS only manages sign-in

The product has one kind of user: the App user, owned by the app. WorkOS is the third party that manages authentication for that person. There is no separate Auth user.

A signed-in session is matched to its App user by the identity on the session — the JWT `iss|sub` stored as `tokenIdentifier` — and, if that issuer no longer matches, by `workosUserId`. Email is a contact field on the App user. It can change, and it is never the key that decides who is signed in.

Treating WorkOS’s user and the app’s user as two person-kinds (“Auth user ≠ App user”) was rejected. That split described one person twice. WorkOS holds the sign-in portion of the same App user.
