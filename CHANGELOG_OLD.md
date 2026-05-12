# Older changes
## 0.4.1 (2025-10-17)
- move to npm trusted publishing

## 0.4.0 (2025-10-07)
- improve init process: do preinit, if inverter is not in state FeedIn; trigger init as soon as inverter goes to FeedIn

## 0.3.0 (2025-10-06)
- update documentation with soction of tested models
- enhance port selection related to http/https for base settings
- do not poll data points related to battery, if no battery is present
- update dependencies

## 0.2.1 (2025-08-29)
- update dependencies

## 0.2.0 (2025-07-22)
- check Inverter_State for FeedIn before init
- suspend error logging on too many errors
- add timeout to API calls
- update translations

## 0.1.4 (2025-06-17)
- fix logging for preset and optional data

## 0.1.3 (2025-06-15)
- add some logging for debugging
- fix log warnings

## 0.1.2 (2025-06-01)
- add node 24 to tests
- chores

## 0.1.1 (2025-04-07)

- fix object hierarchy
- fix missing translations, adjust translations based on system language
- fix state roles

## 0.1.0 (2025-03-29)

- add notification on available updates
- make sure init completes without errors

## 0.0.8 (2025-03-28)

- fix writing of settings after 0.0.7
- fix crash after failed API requests

## 0.0.7 (2025-03-26)

- replace ':' by '_' in object IDs
- delete unused objects and channels

## 0.0.6 (2025-03-14)

-   fix repo url in package.json

## 0.0.5 (2025-03-14)

-   avoid potential issues: js-controller >= 7.0.6

## 0.0.4 (2025-03-14) 0.0.4

-   prepare for iobroker repo

## 0.0.4-beta.1 (2025-03-14) beta 1 with translations

-   update translations

## 0.0.4-beta.0 (2025-03-13) beta 1

-   exclude react from test:js
-   terminate on authentication issue (fix)
-   add read and write for settings

## 0.0.3-alpha.1 (2025-03-10)

-   eslint
-   remove node 18.x from github workflow

## 0.0.3-alpha.0 (2025-03-10)

-   Did some changes
-   Did some more changes

## v0.0.1 (2025-03-10)

Initial release
