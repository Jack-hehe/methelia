# Build an interactive personal homepage with HTML, CSS and JavaScript

> Narration approved by the user on 2026-09-06. Each chapter is one audio file, with a pause at page boundaries.

## 1. Web basics: content, appearance and click behavior

Compare one webpage to distinguish HTML content, CSS appearance and JavaScript behavior, then choose the right language for a requested change.

### 1. One personal homepage: what do the three languages do?

Hello everyone, and welcome to Methelia. Today we will work together on a personal homepage with a heading, introductory text and a button that changes the heading when clicked. You do not need previous coding experience. We will start by understanding what we see, then make small changes to real files. Early webpages primarily shared documents. Modern pages also present visual designs and respond to interaction. That gives us three useful questions: what content belongs here, what should it look like, and what should happen when someone interacts? HTML defines content and structure. CSS controls appearance, including colors, sizes and spacing. JavaScript handles behavior. Look at the heading and button in this example. Select CSS and choose a button color. Notice that the appearance changes while the words stay the same. Now select JavaScript and click the button to observe the text change. The goal is not just to memorize three names. It is to classify a change as content, appearance or behavior. Playback will pause at the end of this page. Try the comparison yourself, then choose the next page.

### 2. Teacher demonstration: connect HTML tags to the visible heading

Now let us connect the visible page to its HTML. Tags tell the browser the role of each piece of content. The h1 element marks a main heading, p marks a paragraph, and button creates a button. First select h1 and identify the heading it represents. Then watch the demonstration. We open index.html and replace My first website with Hello Methelia, preserving the tags on both sides. Notice the distinction: the tags identify the content as a heading, while the words between them are what the reader sees. The heading changes, but this edit does not change the button color or add a new click action. For now, focus on understanding the demonstration. In the next chapter you will make the change in your own file. When playback pauses, inspect p and button as well and match each tag to its visible element.

### 3. Understanding check: which language changes only the button fill?

Your turn to decide. We want to turn a purple button green while keeping its label and click response exactly the same. Which language would you change? Before selecting an answer, classify the requirement: does it concern content, appearance or behavior? After answering, read the explanation and compare it with your reason. A correct choice is useful, but being able to explain the choice is the skill we are building. This page will pause so you can answer. Once you finish, we will move into the HTML chapter and edit the actual heading of your personal homepage.

## 2. HTML practice: change the main heading of your homepage

Identify h1, p and button, edit and save the heading in index.html, and confirm the preview result.

### 1. Read HTML: tags identify the role of content

Welcome back. In this chapter you will change the main heading of your personal homepage. We know HTML supplies content, but how does the browser distinguish a heading from an introduction? It reads the tags. An h1 marks the main heading, p marks a paragraph, and button creates a button. These elements usually have an opening tag and a closing tag, with content between them. Replacing the words preserves their role as long as the tags remain. Inspect these three elements and decide where a name, an introduction and an action belong. Our first coding exercise focuses on the heading so that you can complete a small, reliable cycle: locate the content, edit it, save it and check the result.

### 2. Teacher demonstration: edit h1 in index.html

Watch the teacher first. In the teaching Terminal, enter edit index.html to open the page file. Find My first website between the h1 tags and replace those words with Hello Methelia. We are editing the content, so we leave both tags and the other elements in place. Look at the preview: the heading text changes while the styling and button remain. This demonstration uses a separate copy of the work. You will still make the change in your own file in the next activity. Before continuing, make sure you can point to the exact text being changed and explain why the tags stay.

### 3. Your practice: save the Hello Methelia heading

Now open your own index.html and change the main heading to Hello Methelia. Use that exact text for this exercise so the checker can verify the requested edit. Look at the preview, save the file, and select Check my practice. If it does not pass, check whether you edited the heading rather than the paragraph. Then check spelling, spacing and whether your latest change was saved. Make one small change at a time; that makes mistakes easier to locate. Playback will pause at the end of this page. Take the time you need to complete the edit before continuing.

### 4. Check the result: what changed, and what stayed the same?

Let us inspect the result. The main heading should now read Hello Methelia. The original styling and button are still present because changing HTML text did not rewrite the stylesheet or the event handler. Explain the difference in your own words: the tags identify the role of the content, and the text between them supplies the words that appear. Understanding that distinction is more useful than memorizing a line number. In the next chapter, we will keep the content and use CSS to change the appearance of the button.

## 3. CSS practice: change a button fill and understand padding

Distinguish color, background and padding, then set the button background in style.css to the specified green and verify it.

### 1. Three CSS properties: text color, background and padding

This chapter changes how the same homepage looks. HTML supplies its content; CSS adjusts presentation while preserving that structure. First distinguish three common properties. Color controls the text color. Background controls the fill behind the content. Padding creates space between the content and the edge of an element. For example, when a button label feels cramped, increasing padding is more appropriate than inserting spaces into the label. Our exercise changes the button fill from purple to green. Before editing, ask yourself whether you mean the letters or the surface behind them. That small distinction tells you which property to use.

### 2. Teacher demonstration: change the button rule in style.css

Watch the teacher open style.css and find the button rule. The selector identifies which elements receive the settings inside the braces. We find background and replace its purple value with the green value shown on screen. A color beginning with a hash can describe a color using hexadecimal digits. You do not need to memorize the code; focus on where it is used. The button fill changes, but the label does not. Also notice that we edited the button background, not the page background in the body rule. Comparing the target and the property helps explain exactly why this change affects the button.

### 3. Your practice: set the button background to #23856b

Open style.css and set background inside the button rule to the green value shown on screen. Keep the colon after the property name and the semicolon at the end of the declaration. Inspect the preview, then save and verify your practice. If the entire page changes color, you may have edited the body rule. If the letters turn green, you may have changed color instead of background. These visible differences are clues, not just signs that something went wrong. Playback will pause so you can compare the code and preview carefully before moving on.

### 4. Check the result: appearance changes without rewriting behavior

The button should now have a green fill. This style change did not rewrite the text in HTML or the click action in JavaScript. That is the benefit of separating content, appearance and behavior. Review the three properties: color affects letters, background affects the fill, and padding controls the space inside an element. This exercise checks the requested background change. You can use the same method to explore other settings later, changing one property and observing its effect. Next, we will change what the button does when it receives a click.

## 4. JavaScript practice: update a heading when a button is clicked

Explain element selection, a click listener and textContent, then edit and verify the click result in app.js.

### 1. How does a click become a visible update?

We can now change content and appearance. This chapter adds a concrete understanding of interaction: when someone clicks the button, the heading should say Hello Methelia. Break the task into three steps. First find the button. Next register what should happen when it is clicked. Finally update the heading inside that action. The names on screen match those steps: querySelector finds an element, addEventListener listens for an event, and textContent changes the text in an element. You do not need to memorize the whole program at once. Follow the sequence from finding the button, through receiving a click, to updating the heading.

### 2. Teacher demonstration: edit the click callback in app.js

Watch the teacher open app.js. The example finds the button with the identifier hello and listens for its click event. When the event occurs, the code inside the callback runs. One statement finds h1 and sets its textContent. We preserve that structure and replace only the greeting with Hello Methelia. Then we click the preview button to check the result. Unlike editing the initial HTML text, this statement describes what happens when an event occurs. Observe the complete sequence: edit the event handler, then trigger the event. Next you will repeat those steps in your own file.

### 3. Your practice: make the click action set Hello Methelia

Find the original greeting in app.js and replace it with Hello Methelia. Change the words inside the quotation marks while preserving the quotes, braces and listener structure. Save the file, click the button and verify your practice. Your HTML heading may already contain Hello Methelia from the earlier exercise, so seeing those words on screen is not enough by itself. Check that the event handler in app.js really contains the new text and that the button still works. This page will pause to give you time. Once you finish, we will explain the event sequence together.

### 4. Explain the event sequence: select, listen, update

Look at app.js and explain it as if you were teaching another learner. First we select the button. Then we register a click handler. When the user actually clicks, the handler updates the heading text. That sequence is a starting point for many interfaces, including menus, messages and content switches. Today we built a small complete example. Your homepage now combines content, styling and click behavior. In the final chapter, we will inspect the files, check the preview and download the static website so you can keep your work.

## 5. Finish your website: inspect HTML, CSS and JavaScript, then export

Inspect files with the teaching Terminal, start its preview, check the website and download the static files.

### 1. Inspect the three website files with the teaching Terminal

In this final chapter we will organize the website into a result you can keep. Three files work together: index.html supplies content, style.css supplies presentation, and app.js supplies interaction. The Terminal here is a teaching interface for the course virtual files, not a system terminal on your computer. Enter ls to list the files. Check that all three are present and recall what each one does. This simple check matters because saving only the HTML while forgetting its stylesheet or script can produce an incomplete result when you open it elsewhere.

### 2. Inspect the source with cat index.html

Enter cat index.html to inspect the file text. The Terminal displays source code; the preview displays what the browser builds from that code. Look for the heading, but also find the reference to style.css and the reference to app.js. These tell the browser where the other files are located. When you download or move the website, preserve the filenames and their relative positions. You do not need to rewrite the program here. Connect each file reference to its role, then continue to the preview check.

### 3. Start the teaching preview and verify it

Enter the preview command shown on screen: python -m http.server 8000, then press Enter. We need to be precise about what this environment does. In this course, the platform interprets that command as a request to open its website preview. It does not start a real Python server, and it does not publish the site on the internet. Once the preview opens, check the heading, the green button and the click result. Select Check my practice so the system can confirm that the preview is running. Playback will pause while you work. If something is wrong, use its role to decide whether to inspect HTML, CSS or JavaScript.

### 4. Your result: download the interactive static homepage

Congratulations on completing this course. Let us revisit what you can now do: edit an HTML heading, change a CSS button background, and set the text produced by a JavaScript click handler. More importantly, you can classify a new requirement as content, appearance or behavior before editing. Use the website download control to save the project as a ZIP. The archive contains your static website files, but downloading does not publish a public URL. Deployment is a separate step. What you have completed here is an interactive personal homepage that you can preview and keep. You can now replace the exercise text with your own introduction and expand the page using the same three responsibilities. Thank you for learning with us, and see you in the next course.

