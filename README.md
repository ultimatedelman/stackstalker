StackStalker
============

**Monitor any question from any Stack Exchange site and see when it is updated.**

Latest version: 3.0.1 | Released: Sept. 13, 2014

Rewritten from near-scratch, **StackStalker** is a **chrome extension** that will monitor any question on any [Stack Exchange](http://stackexchange.com/sites) site and let you know when something has updated. Don't sit there and mash your F5 key waiting for something to happen. Instead, while viewing a question, click the StackStalker icon next to the address bar, and click the "Add this question" button. Then go browse something else while StalkStalker does the work for you. No need for logging in or creating a Stack Exchange account.

When you've added one or more questions, the logo will turn from gray (inactive) to blue (active). When a question has been updated, meaning the answer count, comment count, upvote count, or answer acceptance status has been updated, the icon will display a number for how many questions have been updated.

Clicking on the StackStalker icon will bring up a popup window displaying the questions you've chosen to monitor. On the left of each question are at least two action buttons: toggle monitor (eye icon) and delete (X icon). If the question has been updated, its background will turn yellow and you'll have one more action button: mark as read (book icon).

If you click on the eye icon, it will open or close the eye, indicating whether or not StackStalker will actively check for updates to this question. It's recommended that you un-monitor older, less active questions to prevent unnecessary requests to the Stack Exchange API.

Clicking the X icon will remove the question from your list. You can always add it back by revisiting the question and adding it again.

Clicking the book icon will remove the "updated" status from the question you are monitoring without navigating to the question. If you click the title of the question, it will remove the "updated" status as well.

Please feel free to direct suggestions, bugs, or pull requests to this repository.
