/**
 * SoleTrade Welding — main site script
 * Vanilla JS, no build step. Handles:
 *  - EN/ES translation switching
 *  - mobile navigation
 *  - weld-seam scroll reveal
 *  - projects grid rendering + lightbox / before-after slider
 *  - testimonials carousel (auto-rotates every 5s)
 *  - contact form validation + email sending (EmailJS with mailto fallback)
 *  - defensive image error handling
 */
(function () {
  "use strict";

  /* =========================================================
     0. EmailJS configuration
     ---------------------------------------------------------
     To enable real email delivery from the contact form:
     1. Create a free account at https://www.emailjs.com
     2. Create an Email Service and an Email Template
     3. Replace the three placeholder values below with your
        Service ID, Template ID and Public Key.
     Until configured, the form automatically falls back to
     opening the visitor's email client with the message
     pre-filled (mailto:), so the form always "sends" the
     enquiry one way or another.
     ========================================================= */
  var EMAILJS_CONFIG = {
    serviceId: "YOUR_EMAILJS_SERVICE_ID",
    templateId: "YOUR_EMAILJS_TEMPLATE_ID",
    publicKey: "YOUR_EMAILJS_PUBLIC_KEY"
  };

  var isEmailJsConfigured =
    EMAILJS_CONFIG.serviceId.indexOf("YOUR_") !== 0 &&
    EMAILJS_CONFIG.templateId.indexOf("YOUR_") !== 0 &&
    EMAILJS_CONFIG.publicKey.indexOf("YOUR_") !== 0;

  /* =========================================================
     1. i18n
     ========================================================= */
  var LANG_KEY = "soletrade-lang";
  var currentLang = localStorage.getItem(LANG_KEY) || "en";

  function t(key, lang) {
    var dict = window.SOLETRADE_I18N[lang || currentLang] || {};
    return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
  }

  function applyTranslations() {
    document.documentElement.setAttribute("lang", currentLang);

    document.title = t("meta.title");
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.description"));

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });

    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      var isActive = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    // Hero title is split into three spans for the accent color, rebuild it.
    var heroTitle = document.getElementById("heroTitle");
    if (heroTitle) {
      heroTitle.innerHTML =
        escapeHtml(t("hero.title.pre")) +
        '<span>' + escapeHtml(t("hero.title.accent")) + "</span>" +
        escapeHtml(t("hero.title.post"));
    }

    // Re-render dynamic content that mixes JS templates with i18n text
    renderProjects();
    renderTestimonials(true);
    updateContactLinks();

    if (currentLightboxProject) {
      renderLightboxContent(currentLightboxProject, currentSlideIndex);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function setLang(lang) {
    if (lang !== "en" && lang !== "es") return;
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations();
  }

  /* =========================================================
     2. Mobile navigation
     ========================================================= */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });

    // active link highlighting based on visible section
    var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
    var navLinks = nav.querySelectorAll(".nav-list a");
    if ("IntersectionObserver" in window && sections.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              navLinks.forEach(function (link) {
                link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
              });
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      sections.forEach(function (section) {
        observer.observe(section);
      });
    }
  }

  /* =========================================================
     3. Weld-seam scroll reveal
     ========================================================= */
  function initWeldSeams() {
    var seams = document.querySelectorAll(".weld-seam");
    if (!seams.length) return;

    if (!("IntersectionObserver" in window)) {
      seams.forEach(function (seam) {
        seam.classList.add("in-view");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    seams.forEach(function (seam) {
      observer.observe(seam);
    });
  }

  /* =========================================================
     4. Projects grid + lightbox / before-after slider
     ========================================================= */
  var currentLightboxProject = null;
  var currentSlideIndex = 0;
  var lastFocusedElement = null;

  function waMessage(projectTitle) {
    var lead = currentLang === "es"
      ? "Hola SoleTrade Welding, estoy interesado en un proyecto como: "
      : "Hi SoleTrade Welding, I'm interested in a project like: ";
    return encodeURIComponent(lead + projectTitle);
  }

  function waLink(projectTitle) {
    var contact = window.SOLETRADE_CONTACT;
    return "https://wa.me/" + contact.whatsappNumber + "?text=" + waMessage(projectTitle);
  }

  var whatsappIconSvg =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.36.66 4.55 1.8 6.43L4 29l7.77-1.75A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.64 28 15S22.63 3 16.02 3Zm6.98 17.03c-.3.83-1.5 1.55-2.44 1.75-.65.14-1.5.25-4.36-.94-3.66-1.5-6.02-5.2-6.2-5.44-.18-.24-1.48-1.97-1.48-3.76 0-1.79.94-2.67 1.27-3.03.33-.36.72-.45.96-.45.24 0 .48 0 .69.01.22.01.52-.08.81.63.3.72 1.02 2.5 1.11 2.68.09.18.15.4.03.64-.12.24-.18.4-.36.61-.18.21-.38.47-.54.63-.18.18-.37.37-.16.73.21.36.94 1.56 2.03 2.53 1.4 1.25 2.58 1.64 2.94 1.82.36.18.57.15.78-.09.21-.24.9-1.05 1.14-1.41.24-.36.48-.3.81-.18.33.12 2.1.99 2.46 1.17.36.18.6.27.69.42.09.15.09.85-.21 1.68Z"/></svg>';

  var expandIconSvg =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function renderProjects() {
    var grid = document.getElementById("projectsGrid");
    if (!grid || !window.SOLETRADE_PROJECTS) return;

    grid.innerHTML = "";
    window.SOLETRADE_PROJECTS.forEach(function (project) {
      var title = t(project.keys.title);
      var article = document.createElement("article");
      article.className = "project-card";

      article.innerHTML =
        '<button type="button" class="project-media" data-project="' + project.id + '" aria-haspopup="dialog">' +
          '<img src="' + project.cover + '" alt="' + escapeHtml(title) + '" loading="lazy" width="400" height="300">' +
          '<span class="expand-hint">' + expandIconSvg + '<span>' + escapeHtml(t("projects.view_gallery")) + '</span></span>' +
        '</button>' +
        '<div class="project-body">' +
          '<p class="project-tag">' + escapeHtml(t(project.keys.tag)) + '</p>' +
          '<h3>' + escapeHtml(title) + '</h3>' +
          '<p>' + escapeHtml(t(project.keys.desc)) + '</p>' +
          '<div class="project-footer">' +
            '<span class="project-location">' + escapeHtml(t(project.keys.location)) + '</span>' +
            '<a class="whatsapp-chip" href="' + waLink(title) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHtml(t("projects.whatsapp_ask")) + ' — ' + escapeHtml(title) + '">' +
              whatsappIconSvg + '<span>' + escapeHtml(t("projects.whatsapp_ask")) + '</span>' +
            '</a>' +
          '</div>' +
        '</div>';

      grid.appendChild(article);
    });

    grid.querySelectorAll(".project-media").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openLightbox(btn.getAttribute("data-project"), btn);
      });
    });
  }

  function findProject(id) {
    return window.SOLETRADE_PROJECTS.find(function (p) {
      return p.id === id;
    });
  }

  function openLightbox(projectId, triggerEl) {
    var project = findProject(projectId);
    if (!project) return;

    currentLightboxProject = project;
    currentSlideIndex = 0;
    lastFocusedElement = triggerEl || document.activeElement;

    renderLightboxContent(project, 0);

    var lightbox = document.getElementById("lightbox");
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    var closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.focus();

    document.addEventListener("keydown", onLightboxKeydown);
  }

  function closeLightbox() {
    var lightbox = document.getElementById("lightbox");
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onLightboxKeydown);
    currentLightboxProject = null;
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function onLightboxKeydown(e) {
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowRight") {
      moveSlide(1);
    } else if (e.key === "ArrowLeft") {
      moveSlide(-1);
    }
  }

  function renderLightboxContent(project, slideIndex) {
    var title = t(project.keys.title);
    var track = document.getElementById("lightboxTrack");
    var dots = document.getElementById("lightboxDots");
    var counter = document.getElementById("lightboxCounter");
    var info = document.getElementById("lightboxInfo");

    track.innerHTML = project.gallery
      .map(function (src, i) {
        return (
          '<div class="slider-slide">' +
          '<img src="' + src + '" alt="' + escapeHtml(title) + ' — ' + escapeHtml(t(window.SOLETRADE_STAGE_KEYS[i].title)) + '" loading="lazy" width="400" height="300">' +
          '</div>'
        );
      })
      .join("");

    dots.innerHTML = project.gallery
      .map(function (_, i) {
        return '<button type="button" data-slide="' + i + '" aria-label="Photo ' + (i + 1) + '"></button>';
      })
      .join("");

    dots.querySelectorAll("button").forEach(function (dot) {
      dot.addEventListener("click", function () {
        goToSlide(parseInt(dot.getAttribute("data-slide"), 10));
      });
    });

    var stage = window.SOLETRADE_STAGE_KEYS[slideIndex];
    info.innerHTML =
      '<p class="project-tag">' + escapeHtml(t(project.keys.tag)) + '</p>' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      '<p class="stage-caption">' + (slideIndex + 1) + "/5 · " + escapeHtml(t(stage.title)) + '</p>' +
      '<p>' + escapeHtml(t(stage.desc)) + '</p>' +
      '<a class="btn btn-whatsapp" href="' + waLink(title) + '" target="_blank" rel="noopener noreferrer">' +
        whatsappIconSvg + '<span>' + escapeHtml(t("projects.whatsapp_ask")) + '</span>' +
      '</a>';

    counter.textContent = slideIndex + 1 + " / " + project.gallery.length;
    updateSlidePosition(slideIndex);
  }

  function updateSlidePosition(index) {
    var track = document.getElementById("lightboxTrack");
    var dots = document.getElementById("lightboxDots");
    track.style.transform = "translateX(-" + index * 100 + "%)";
    dots.querySelectorAll("button").forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
    });
  }

  function goToSlide(index) {
    if (!currentLightboxProject) return;
    var total = currentLightboxProject.gallery.length;
    currentSlideIndex = (index + total) % total;
    renderLightboxContent(currentLightboxProject, currentSlideIndex);
  }

  function moveSlide(delta) {
    goToSlide(currentSlideIndex + delta);
  }

  function initLightbox() {
    var lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    lightbox.querySelector(".slider-prev").addEventListener("click", function () {
      moveSlide(-1);
    });
    lightbox.querySelector(".slider-next").addEventListener("click", function () {
      moveSlide(1);
    });

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  /* =========================================================
     5. Testimonials carousel (auto-rotates every 5s)
     ========================================================= */
  var testimonialIndex = 0;
  var testimonialTimer = null;
  var TESTIMONIAL_COUNT = 5;

  function renderTestimonials(preserveIndex) {
    var track = document.getElementById("testimonialTrack");
    var dots = document.getElementById("testimonialDots");
    if (!track || !dots) return;

    var indexToKeep = preserveIndex ? testimonialIndex : 0;

    var slidesHtml = "";
    var dotsHtml = "";
    for (var i = 1; i <= TESTIMONIAL_COUNT; i++) {
      var active = (i - 1) === indexToKeep ? " is-active" : "";
      slidesHtml +=
        '<blockquote class="testimonial-slide' + active + '">' +
        '<p class="testimonial-quote">\u201C' + escapeHtml(t("testimonial." + i + ".quote")) + '\u201D</p>' +
        '<p class="testimonial-name">' + escapeHtml(t("testimonial." + i + ".name")) + '</p>' +
        '<p class="testimonial-company">' + escapeHtml(t("testimonial." + i + ".company")) + '</p>' +
        '</blockquote>';
      dotsHtml += '<button type="button" data-slide="' + (i - 1) + '" class="' + (i - 1 === indexToKeep ? "is-active" : "") + '" aria-label="Review ' + i + '"></button>';
    }
    track.innerHTML = slidesHtml;
    dots.innerHTML = dotsHtml;

    testimonialIndex = indexToKeep;

    dots.querySelectorAll("button").forEach(function (dot) {
      dot.addEventListener("click", function () {
        goToTestimonial(parseInt(dot.getAttribute("data-slide"), 10));
        restartTestimonialTimer();
      });
    });
  }

  function goToTestimonial(index) {
    var slides = document.querySelectorAll(".testimonial-slide");
    var dots = document.querySelectorAll(".testimonial-dots button");
    testimonialIndex = (index + TESTIMONIAL_COUNT) % TESTIMONIAL_COUNT;
    slides.forEach(function (slide, i) {
      slide.classList.toggle("is-active", i === testimonialIndex);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === testimonialIndex);
    });
  }

  function startTestimonialTimer() {
    testimonialTimer = window.setInterval(function () {
      goToTestimonial(testimonialIndex + 1);
    }, 5000);
  }

  function restartTestimonialTimer() {
    if (testimonialTimer) window.clearInterval(testimonialTimer);
    startTestimonialTimer();
  }

  function initTestimonials() {
    renderTestimonials(false);
    startTestimonialTimer();

    var wrapper = document.querySelector(".testimonials");
    if (!wrapper) return;
    ["mouseenter", "focusin"].forEach(function (evt) {
      wrapper.addEventListener(evt, function () {
        if (testimonialTimer) window.clearInterval(testimonialTimer);
      });
    });
    ["mouseleave", "focusout"].forEach(function (evt) {
      wrapper.addEventListener(evt, function () {
        restartTestimonialTimer();
      });
    });
  }

  /* =========================================================
     6. Contact info links + form validation + sending
     ========================================================= */
  function updateContactLinks() {
    var contact = window.SOLETRADE_CONTACT;

    var waEl = document.getElementById("contactWhatsapp");
    if (waEl) {
      waEl.textContent = contact.whatsappDisplay;
      waEl.href = "https://wa.me/" + contact.whatsappNumber;
    }
    var emailEl = document.getElementById("contactEmail");
    if (emailEl) {
      emailEl.textContent = contact.email;
      emailEl.href = "mailto:" + contact.email;
    }
    var igEl = document.getElementById("contactInstagram");
    if (igEl) {
      igEl.textContent = contact.instagramHandle;
      igEl.href = contact.instagramUrl;
    }
    var addrEl = document.getElementById("contactAddress");
    if (addrEl) {
      addrEl.textContent = currentLang === "es" ? contact.addressEs : contact.addressEn;
    }
  }

  var VALIDATORS = {
    name: function (value) {
      return value.trim().length >= 2;
    },
    email: function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    },
    phone: function (value) {
      return /^[+]?[0-9()\-\s]{7,20}$/.test(value.trim());
    },
    requestType: function (value) {
      return value.trim().length > 0;
    },
    comment: function (value) {
      return value.trim().length >= 10;
    }
  };

  var ERROR_KEYS = {
    name: "form.name_error",
    email: "form.email_error",
    phone: "form.phone_error",
    requestType: "form.type_error",
    comment: "form.comment_error"
  };

  function validateField(field) {
    var name = field.name;
    var validator = VALIDATORS[name];
    if (!validator) return true;

    var row = field.closest(".form-row");
    var isValid = validator(field.value);
    if (row) {
      row.classList.toggle("has-error", !isValid);
      var errorEl = row.querySelector(".field-error");
      if (errorEl) errorEl.textContent = t(ERROR_KEYS[name]);
    }
    field.setAttribute("aria-invalid", String(!isValid));
    return isValid;
  }

  function showFormStatus(form, type, message) {
    var status = form.querySelector(".form-status");
    if (!status) return;
    status.textContent = message;
    status.className = "form-status is-visible " + (type === "success" ? "is-success" : "is-error");
    status.setAttribute("role", type === "success" ? "status" : "alert");
  }

  function sendViaEmailJs(payload) {
    return window.emailjs
      .send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, payload, EMAILJS_CONFIG.publicKey)
      .then(function () {
        return true;
      });
  }

  function sendViaMailto(payload) {
    var contact = window.SOLETRADE_CONTACT;
    var subject = encodeURIComponent("New enquiry from " + payload.name + " — " + payload.request_type);
    var body = encodeURIComponent(
      "Name: " + payload.name + "\n" +
      "Email: " + payload.email + "\n" +
      "Phone: " + payload.phone + "\n" +
      "Request type: " + payload.request_type + "\n\n" +
      "Message:\n" + payload.message
    );
    window.location.href = "mailto:" + contact.email + "?subject=" + subject + "&body=" + body;
    return Promise.resolve(true);
  }

  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var fields = form.querySelectorAll("input[name], select[name], textarea[name]");
    fields.forEach(function (field) {
      field.addEventListener("blur", function () {
        validateField(field);
      });
      field.addEventListener("input", function () {
        var row = field.closest(".form-row");
        if (row && row.classList.contains("has-error")) {
          validateField(field);
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var allValid = true;
      fields.forEach(function (field) {
        if (!validateField(field)) allValid = false;
      });

      if (!allValid) {
        var firstError = form.querySelector(".form-row.has-error input, .form-row.has-error select, .form-row.has-error textarea");
        if (firstError) firstError.focus();
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = t("form.sending");

      var payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        request_type: form.requestType.options[form.requestType.selectedIndex].text,
        message: form.comment.value.trim()
      };

      var sendPromise = isEmailJsConfigured && window.emailjs ? sendViaEmailJs(payload) : sendViaMailto(payload);

      sendPromise
        .then(function () {
          showFormStatus(form, "success", t("form.success"));
          form.reset();
          fields.forEach(function (field) {
            var row = field.closest(".form-row");
            if (row) row.classList.remove("has-error");
          });
        })
        .catch(function () {
          showFormStatus(form, "error", t("form.error"));
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  }

  /* =========================================================
     7. Defensive image handling — no broken links visible
     ========================================================= */
  function initImageFallbacks() {
    document.addEventListener(
      "error",
      function (e) {
        var el = e.target;
        if (el && el.tagName === "IMG" && !el.dataset.fallbackApplied) {
          el.dataset.fallbackApplied = "true";
          el.classList.add("broken-fallback");
          el.alt = el.alt || "Image unavailable";
          console.warn("SoleTrade Welding: image failed to load —", el.src);
        }
      },
      true
    );
  }

  /* =========================================================
     8. Misc: language toggle buttons, back-to-top, footer year
     ========================================================= */
  function initLangToggle() {
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });
  }

  function initBackToTop() {
    document.querySelectorAll(".back-to-top").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  /* =========================================================
     Init
     ========================================================= */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initWeldSeams();
    initLightbox();
    initTestimonials();
    initContactForm();
    initImageFallbacks();
    initLangToggle();
    initBackToTop();
    applyTranslations();
  });
})();
