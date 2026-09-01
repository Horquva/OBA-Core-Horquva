**Accessibility Fundamentals — Research Notes**

**Author:** Ayla Sajid | **Platform:** Accessibility Platform | **Day 1 — Week 2**

**1. What Is Accessibility?**

Accessibility (often shortened to "a11y") means designing and building digital products so that people with disabilities can perceive, understand, navigate, and interact with them just as effectively as anyone else.

"Disability" here is broader than most people assume. It includes:

- **Visual** — blindness, low vision, color blindness

- **Auditory** — deafness, hard of hearing

- **Motor** — limited fine motor control, inability to use a mouse, tremors, one-handed use

- **Cognitive** — memory issues, attention/reading difficulties, learning disabilities

- **Situational/temporary** — a broken arm, bright sunlight on a screen, a noisy environment where audio can't be heard

This last category matters a lot: accessibility improvements (like captions, keyboard support, high contrast) end up helping *everyone*, not just people with permanent disabilities. That's the core argument for why it's engineered in from the start rather than bolted on later.

**2. The POUR Framework (from WCAG)**

WCAG organizes all accessibility requirements under four principles — everything traces back to one of these:

| **Principle**      | **Meaning**                                                                        | **Example**                                                                                            |
|--------------------|------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| **Perceivable**    | Users must be able to perceive the content through at least one sense.             | Images need alt text so screen readers can describe them to blind users.                               |
| **Operable**       | Users must be able to operate all interface controls.                              | Every button/link must be usable with a keyboard alone, not just a mouse.                              |
| **Understandable** | Content and operation must be clear and predictable.                               | Error messages should say *what* went wrong and *how to fix it*, not just "Error."                     |
| **Robust**         | Content must work reliably across different tools, including assistive technology. | Using real <button> elements instead of a styled <div> so screen readers recognize it as a button. |

If a design fails one of these four, it's an accessibility problem — this is the mental checklist to run any new feature through.

**3. WCAG 2.2 — What It Actually Is**

- WCAG = **Web Content Accessibility Guidelines**, published by the W3C. It's the global standard almost every accessibility law (ADA, EAA, etc.) is based on.

- WCAG 2.2 is the current version; it adds a handful of new success criteria on top of WCAG 2.1 (mostly around focus visibility and touch targets — relevant to our Day 2 standards work).

- Guidelines are grouped into three **conformance levels**:

  - **A** — minimum, absolute basics

  - **AA** — the standard most companies target (this should be our baseline for Castor)

  - **AAA** — highest, often impractical for an entire product

- **Takeaway for us:** target **WCAG 2.2 Level AA** as the constitutional baseline. That's the industry-normal bar and is specific enough to be testable.

**4. Key Terminology**

- **Screen reader** — software (e.g. VoiceOver on Mac/iOS, NVDA/JAWS on Windows, TalkBack on Android) that reads screen content aloud or outputs it to a braille display, for blind/low-vision users.

- **Alt text** — a short text description attached to an image so screen readers can convey what the image shows.

- **ARIA** (Accessible Rich Internet Applications) — a set of HTML attributes (e.g. aria-label, aria-hidden) that add accessibility information to elements that don't have it built in natively.

- **Focus state / focus indicator** — the visible highlight (usually an outline) showing which element is currently selected via keyboard (Tab key).

- **Semantic HTML** — using HTML elements for their intended meaning (<nav>, <button>, <h1>) instead of generic <div>/<span> styled to look similar. Screen readers rely on this to understand structure.

- **Keyboard navigation** — the ability to use an entire interface via keyboard only (Tab, Shift+Tab, Enter, Space, arrow keys) without a mouse.

- **Color contrast ratio** — a measurable ratio between text color and background color; low contrast is unreadable for low-vision users.

- **Assistive technology (AT)** — any tool that helps people with disabilities use digital products: screen readers, screen magnifiers, switch devices, voice control, etc.

**5. Inclusive Design Principles**

Inclusive design principles are guidelines used to create products, services, and environments that work for as many people as possible. The core concepts focus on three main ideas: **recognize exclusion**, **learn from diversity**, and **solve for one, extend to many.**

**Recognize exclusion:** Find biases or barriers in the design process that might block certain people. Finding ways to facilitate everyone by eliminating the factors causing hindrance.

**Learn from diversity:** Involve users with different abilities, backgrounds, and needs to gain better insights. Improve the workforce diversity by hiring people from different cultures.

**Solve for one, extend to many:** Create a fix for a specific user group that often helps a much larger audience (like closed captions made for the deaf that also help people in noisy places).

**Digital Interface Guidelines:**

1.  **Provide a comparable experience:** Ensure everyone reaches the same goal with equal quality, regardless of the tools they use.

2.  **Consider the situation:** Design for temporary challenges or difficult environments, such as bright sunlight or a loud train.

3.  **Be consistent:** Use familiar patterns and clear language so users feel safe and confident.

4.  **Give control and offer choice:** Let people interact and complete tasks in the ways that work best for them.

5.  **Prioritize content:** Help users focus on core tasks by removing clutter and distractions.

**6. Material Design Accessibility Guidance**

Material Design accessibility guidance follows WCAG standards, focusing on touch targets, color contrast, and keyboard navigation to ensure apps are usable for people with vision, motor, or cognitive impairments.

Google's Material Design system bakes accessibility into its component specs directly, rather than treating it as an add-on. Key ideas worth adopting for Castor:

- For Android minimum 48x48 dp touch target size guidance for tappable elements (relevant for our Design System work).

- Built-in contrast requirements for text/icons on Material components. Use high contrast between text and backgrounds (4.5:1 for normal text).

- Add icons or shapes alongside color cues so colorblind users understand the meaning.

- Guidance on motion — respecting "reduce motion" system settings so animations don't trigger discomfort for users with vestibular disorders.

- Ensure users can move through elements using **Tab**, **Shift+Tab**, **Arrow keys**, and **Enter/Space**.

- Every component's documentation includes an explicit accessibility section — this is a good structural model for how we should document Castor's own Design System components.

**7. Flutter Accessibility Capabilities (relevant if/when mobile is built in Flutter)**

- Flutter has built-in **Semantics** widgets that let developers explicitly describe what a widget does for screen readers (similar purpose to ARIA on the web). For example: Imagine a **blind person** is using your app. They cannot see the screen, so their phone reads everything aloud using a screen reader. A **Semantics widget** is like adding a **label or description** to a button or image so the phone knows what to say.

- Supports **TalkBack** (Android) and **VoiceOver** (iOS) out of the box if semantics are set up correctly. These features **read everything on the screen aloud** for users who cannot see well.

- Has accessibility scaling support (respecting system font-size settings) and contrast-checking tools in its dev inspector.

- Main risk: custom-painted widgets (canvas-drawn UI) don't get accessibility info "for free" the way standard widgets do — these need semantics added manually. Worth flagging to the Mobile Experience Platform owner.

> In other words if Flutter already helps make apps accessible for people with disabilities, but **when you create custom-designed UI instead of using Flutter's built-in widgets, you must manually describe those elements so screen readers can understand them.**

**8. Web Accessibility Fundamentals**

- Accessibility should be considered from **design and architecture stage**, not added at the end — retrofitting is far more expensive than building it in.

- The base layer of web accessibility is **semantic HTML** — get this right and a large percentage of accessibility "just works" before any ARIA is needed.

- **"No ARIA is better than bad ARIA"** — a commonly cited principle; incorrect ARIA attributes can make something less accessible than having none at all.

- Accessibility isn't just visual — it also covers audio/video (captions, transcripts) and time-based content (things that auto-advance or time out).

> **FOR EXAMPLE:** Imagine you're creating a login page. A good accessible page would have:

- A heading: **"Login"**

- Labels for the email and password fields

- Buttons that can be reached using the **Tab** key

- Large, readable text

- High-contrast colors

- Error messages like **"Please enter a valid email address."**

- Screen readers announcing all important elements

> This makes the page usable for a much wider range of people.

**9. Common Accessibility Barriers (things to watch for)**

- Low contrast text (light gray on white, etc.)

- Images with no alt text, or unhelpful alt text ("image1.jpg")

- Interfaces that only work with a mouse (no keyboard support)

- Missing or invisible focus indicators

- Form fields with no visible label (placeholder-only text)

- Color used as the *only* way to convey information (e.g. red text alone for errors, with no icon/text)

- Auto-playing video/audio with no way to pause

- Content that breaks or overlaps when text is zoomed/resized

- Pop-ups/modals that trap or lose keyboard focus

**10. Sources**

- W3C WCAG 2.2 (official spec + quick reference)

- Material Design accessibility guidelines (material.io)

- Flutter accessibility documentation (docs.flutter.dev)

- W3C Web Accessibility Initiative (WAI) fundamentals guide

**Summary for the Team**

Accessibility = designing for the full range of human ability, organized under WCAG's four principles (**Perceivable, Operable, Understandable, Robust**). Our target baseline should be **WCAG 2.2 Level AA**. This foundation directly feeds into Day 2, where these principles get turned into specific, testable rules (contrast ratios, touch target sizes, keyboard behavior, etc.) for the Design System to follow.