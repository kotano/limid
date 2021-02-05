# Limid

Limid is a Chrome extension that gently restricts the use of distracting websites.

Unlike other similar extensions, Limid helps you see your free time as a limited resource that should be treated more carefully.

Built using native JavaScript, HTML, CSS and Chrome API.

#### Video Demo

https://youtu.be/wBL--pr_N_o

#### Description

Limid notes when you visit sites on the blocklist and takes up your `free time` until you go to another page. When you don't visit distracting pages, your time recovers, but at a slower pace. If you run out of free time, Limid blocks access to distracting pages and asks you to wait until the time is restored.
This approach is much better psychologically, since access is not blocked until the next day, but only for a short time, and even if you have recovered 5 minutes, you can turn off the blocking and continue browsing, but only for 5 minutes.

The project consists of four modules.
The first module is a background process. It controls all of the extension logic. It monitors which pages you visit, gives commands to block and unblock, increases and decreases the time counter.
The second module is an in-page script. It embeds a blocking layer into the page, stops playing content, communicates with the background process.
The third module is a pop-up window. It provides some contextual commands for the user, allows you to block or unblock pages, displays the amount of free time, allows you to add the current active website to the blocklist.
The fourth module is settings. It works with a database. Allows you to modify the blocklist, set the inhibitor value, change the maximum free time.

**Features**

- You can easily add additional sites to the list via popup or via the extension settings page.

- When you visit site from the blacklist, our time decreases, and if you switch to another site, the time will increase.

- Time increases more slowly due to the inhibitor. The inhibitor value shows how many times slower our free time will recover. If you set the value to 2, it means that to restore one minute for entertainment, you will have to work for two minutes.

- If Limid notices that you have no more free time, then it exits full-screen mode, stops the video blocks the front page and gently asks you to rest until your time recovers at least a little.
  All other sites from the blocklist will be also blocked.

- When you have recovered enough time, you can press the Resume button and continue browsing the content.

- Also, the extension copes well with the situation when you have many windows open with distracting sites.

- The extension will reduce your free time until all distracting pages become inactive.

- You can easily unload pages via popup.
