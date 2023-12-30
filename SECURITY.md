# Security Policy
:white_check_mark: The extension stores a user provided list of the invalid url's they find and decide to save. This information should be secure in chrome's storage. While the user can store any text as an invalid url, there is no known way of cross site scripting as of December 29, 2023. No information leaves the chrome extension, outside the background script feeding the list of broken urls to the specified page's content script
- That being said, if the extension is somehow insecure, create an issue.
