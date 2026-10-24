/**
 * js/forms.js - School Website Public Forms Handler
 * 
 * Handles client-side validation and secure Supabase insertions for:
 * 1. Contact Form (contact.html) -> public.contact_messages
 * 2. Admissions Application Form (admissions.html) -> public.admission_applications
 * 
 * SECURITY & RLS COMPLIANCE:
 * - Public anonymous visitors have INSERT-ONLY permissions under Supabase Row Level Security (RLS).
 * - Client code NEVER attempts to read back submissions (no .select() after insert).
 * - Submit buttons are disabled with spinners during requests to prevent double-submissions.
 * - All Supabase calls are explicitly documented with comments.
 */

import { supabase } from './supabaseClient.js';

// Regex patterns for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,18}$/;

/**
 * Sets an input as invalid and displays its error message
 */
function setFieldError(field, errorElem, message) {
  if (!field) return;
  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');
  if (errorElem) {
    errorElem.textContent = message;
    errorElem.classList.add('is-visible');
  }
}

/**
 * Clears invalid styling and hides error message
 */
function clearFieldError(field, errorElem) {
  if (!field) return;
  field.classList.remove('is-invalid');
  field.removeAttribute('aria-invalid');
  if (errorElem) {
    errorElem.textContent = '';
    errorElem.classList.remove('is-visible');
  }
}

/**
 * Shows a banner message (success or error) in the target status container
 */
function showStatusBanner(container, type, title, message) {
  if (!container) return;
  container.className = `form-status-msg ${type}`;
  container.innerHTML = `
    <div style="font-size: 1.25rem; line-height: 1; flex-shrink: 0;" aria-hidden="true">
      ${type === 'success' ? '✅' : '⚠️'}
    </div>
    <div>
      <strong style="display: block; margin-bottom: 2px;">${title}</strong>
      <span>${message}</span>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Clears the status banner
 */
function clearStatusBanner(container) {
  if (!container) return;
  container.className = 'form-status-msg';
  container.innerHTML = '';
}

/* =============================================================================
   1. CONTACT FORM HANDLER
   ============================================================================= */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusMsg = document.getElementById('contact-status-msg');
  const submitBtn = document.getElementById('contact-submit-btn');

  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const phoneInput = document.getElementById('contact-phone');
  const messageInput = document.getElementById('contact-message');

  const nameError = document.getElementById('contact-name-error');
  const emailError = document.getElementById('contact-email-error');
  const phoneError = document.getElementById('contact-phone-error');
  const messageError = document.getElementById('contact-message-error');

  // Real-time input listeners to clear errors on change
  nameInput?.addEventListener('input', () => {
    if (nameInput.value.trim().length >= 2) clearFieldError(nameInput, nameError);
  });
  emailInput?.addEventListener('input', () => {
    if (EMAIL_REGEX.test(emailInput.value.trim())) clearFieldError(emailInput, emailError);
  });
  phoneInput?.addEventListener('input', () => {
    const val = phoneInput.value.trim();
    if (!val || PHONE_REGEX.test(val)) clearFieldError(phoneInput, phoneError);
  });
  messageInput?.addEventListener('input', () => {
    if (messageInput.value.trim().length >= 10) clearFieldError(messageInput, messageError);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatusBanner(statusMsg);

    let isValid = true;
    let firstInvalidField = null;

    // Validate Name
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      setFieldError(nameInput, nameError, 'Full name is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = nameInput;
    } else if (nameVal.length < 2) {
      setFieldError(nameInput, nameError, 'Name must be at least 2 characters.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = nameInput;
    } else {
      clearFieldError(nameInput, nameError);
    }

    // Validate Email
    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      setFieldError(emailInput, emailError, 'Email address is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = emailInput;
    } else if (!EMAIL_REGEX.test(emailVal)) {
      setFieldError(emailInput, emailError, 'Please enter a valid email address (e.g. name@example.com).');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = emailInput;
    } else {
      clearFieldError(emailInput, emailError);
    }

    // Validate Phone (Optional, but if given, validate format)
    const phoneVal = phoneInput.value.trim();
    if (phoneVal && !PHONE_REGEX.test(phoneVal)) {
      setFieldError(phoneInput, phoneError, 'Please enter a valid phone number (at least 7 digits).');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = phoneInput;
    } else {
      clearFieldError(phoneInput, phoneError);
    }

    // Validate Message
    const messageVal = messageInput.value.trim();
    if (!messageVal) {
      setFieldError(messageInput, messageError, 'Please write your message.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = messageInput;
    } else if (messageVal.length < 10) {
      setFieldError(messageInput, messageError, 'Message must be at least 10 characters long.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = messageInput;
    } else {
      clearFieldError(messageInput, messageError);
    }

    if (!isValid) {
      showStatusBanner(
        statusMsg,
        'error',
        'Submission Incomplete',
        'Please correct the highlighted fields before sending.'
      );
      if (firstInvalidField) firstInvalidField.focus();
      return;
    }

    // Disable button and show spinner
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Sending Message...';

    try {
      // -----------------------------------------------------------------------
      // SUPABASE CALL: Insert contact message into 'contact_messages'
      // -----------------------------------------------------------------------
      // NOTE: Table has Row Level Security (RLS) configured for anonymous inserts.
      // Under public anon key, SELECT is restricted to admins only.
      // We do NOT append .select() because anonymous clients cannot read rows back.
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: nameVal,
            email: emailVal,
            phone: phoneVal || null,
            message: messageVal
          }
        ]);

      if (error) {
        throw error;
      }

      // Success feedback
      showStatusBanner(
        statusMsg,
        'success',
        'Message Sent Successfully!',
        'Thank you, your message has been received. Our administration will contact you shortly.'
      );

      // Reset form fields
      form.reset();
      [nameInput, emailInput, phoneInput, messageInput].forEach(f => {
        if (f) clearFieldError(f, null);
      });

    } catch (err) {
      console.error('Contact form submission error:', err);
      showStatusBanner(
        statusMsg,
        'error',
        'Unable to Send Message',
        'There was a problem delivering your message. Please check your internet connection or reach us directly by phone.'
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

/* =============================================================================
   2. ADMISSION APPLICATION FORM HANDLER
   ============================================================================= */
function initAdmissionForm() {
  const form = document.getElementById('admission-form');
  if (!form) return;

  const statusMsg = document.getElementById('admission-status-msg');
  const submitBtn = document.getElementById('admission-submit-btn');

  const childNameInput = document.getElementById('adm-child-name');
  const dobInput = document.getElementById('adm-dob');
  const classInput = document.getElementById('adm-class');
  const parentNameInput = document.getElementById('adm-parent-name');
  const parentEmailInput = document.getElementById('adm-parent-email');
  const parentPhoneInput = document.getElementById('adm-parent-phone');
  const addressInput = document.getElementById('adm-address');
  const previousSchoolInput = document.getElementById('adm-previous-school');
  const notesInput = document.getElementById('adm-notes');

  const childNameError = document.getElementById('adm-child-name-error');
  const dobError = document.getElementById('adm-dob-error');
  const classError = document.getElementById('adm-class-error');
  const parentNameError = document.getElementById('adm-parent-name-error');
  const parentEmailError = document.getElementById('adm-parent-email-error');
  const parentPhoneError = document.getElementById('adm-parent-phone-error');
  const addressError = document.getElementById('adm-address-error');

  // Real-time input listeners to clear errors on change
  childNameInput?.addEventListener('input', () => {
    if (childNameInput.value.trim().length >= 2) clearFieldError(childNameInput, childNameError);
  });
  dobInput?.addEventListener('input', () => {
    if (dobInput.value) clearFieldError(dobInput, dobError);
  });
  classInput?.addEventListener('change', () => {
    if (classInput.value) clearFieldError(classInput, classError);
  });
  parentNameInput?.addEventListener('input', () => {
    if (parentNameInput.value.trim().length >= 2) clearFieldError(parentNameInput, parentNameError);
  });
  parentEmailInput?.addEventListener('input', () => {
    if (EMAIL_REGEX.test(parentEmailInput.value.trim())) clearFieldError(parentEmailInput, parentEmailError);
  });
  parentPhoneInput?.addEventListener('input', () => {
    if (PHONE_REGEX.test(parentPhoneInput.value.trim())) clearFieldError(parentPhoneInput, parentPhoneError);
  });
  addressInput?.addEventListener('input', () => {
    if (addressInput.value.trim().length >= 5) clearFieldError(addressInput, addressError);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatusBanner(statusMsg);

    let isValid = true;
    let firstInvalidField = null;

    // 1. Child Name
    const childNameVal = childNameInput.value.trim();
    if (!childNameVal) {
      setFieldError(childNameInput, childNameError, "Child's full name is required.");
      isValid = false;
      if (!firstInvalidField) firstInvalidField = childNameInput;
    } else if (childNameVal.length < 2) {
      setFieldError(childNameInput, childNameError, 'Name must be at least 2 characters.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = childNameInput;
    } else {
      clearFieldError(childNameInput, childNameError);
    }

    // 2. Date of Birth
    const dobVal = dobInput.value;
    if (!dobVal) {
      setFieldError(dobInput, dobError, 'Date of birth is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = dobInput;
    } else {
      const birthDate = new Date(dobVal);
      const today = new Date();
      if (isNaN(birthDate.getTime()) || birthDate >= today) {
        setFieldError(dobInput, dobError, 'Please enter a valid date in the past.');
        isValid = false;
        if (!firstInvalidField) firstInvalidField = dobInput;
      } else {
        clearFieldError(dobInput, dobError);
      }
    }

    // 3. Class Applying For
    const classVal = classInput.value;
    if (!classVal) {
      setFieldError(classInput, classError, 'Please select the class applying for.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = classInput;
    } else {
      clearFieldError(classInput, classError);
    }

    // 4. Parent / Guardian Name
    const parentNameVal = parentNameInput.value.trim();
    if (!parentNameVal) {
      setFieldError(parentNameInput, parentNameError, 'Parent / Guardian name is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = parentNameInput;
    } else if (parentNameVal.length < 2) {
      setFieldError(parentNameInput, parentNameError, 'Name must be at least 2 characters.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = parentNameInput;
    } else {
      clearFieldError(parentNameInput, parentNameError);
    }

    // 5. Parent Email
    const parentEmailVal = parentEmailInput.value.trim();
    if (!parentEmailVal) {
      setFieldError(parentEmailInput, parentEmailError, 'Parent email address is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = parentEmailInput;
    } else if (!EMAIL_REGEX.test(parentEmailVal)) {
      setFieldError(parentEmailInput, parentEmailError, 'Please enter a valid email address.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = parentEmailInput;
    } else {
      clearFieldError(parentEmailInput, parentEmailError);
    }

    // 6. Parent Phone
    const parentPhoneVal = parentPhoneInput.value.trim();
    if (!parentPhoneVal) {
      setFieldError(parentPhoneInput, parentPhoneError, 'Parent phone number is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = parentPhoneInput;
    } else if (!PHONE_REGEX.test(parentPhoneVal)) {
      setFieldError(parentPhoneInput, parentPhoneError, 'Please enter a valid phone number (at least 7 digits).');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = parentPhoneInput;
    } else {
      clearFieldError(parentPhoneInput, parentPhoneError);
    }

    // 7. Residential Address
    const addressVal = addressInput.value.trim();
    if (!addressVal) {
      setFieldError(addressInput, addressError, 'Residential address is required.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = addressInput;
    } else if (addressVal.length < 5) {
      setFieldError(addressInput, addressError, 'Address must be at least 5 characters long.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = addressInput;
    } else {
      clearFieldError(addressInput, addressError);
    }

    if (!isValid) {
      showStatusBanner(
        statusMsg,
        'error',
        'Incomplete Application',
        'Please correct the highlighted fields before submitting.'
      );
      if (firstInvalidField) firstInvalidField.focus();
      return;
    }

    // Optional fields
    const prevSchoolVal = previousSchoolInput?.value.trim() || null;
    const notesVal = notesInput?.value.trim() || null;

    // Disable button and show spinner
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Submitting Application...';

    try {
      // -----------------------------------------------------------------------
      // SUPABASE CALL: Insert application into 'admission_applications'
      // -----------------------------------------------------------------------
      // NOTE: Table has Row Level Security (RLS) configured for anonymous inserts.
      // Under public anon key, SELECT is restricted to admins only.
      // We do NOT append .select() because anonymous clients cannot read rows back.
      const { error } = await supabase
        .from('admission_applications')
        .insert([
          {
            child_name: childNameVal,
            date_of_birth: dobVal,
            class_applying_for: classVal,
            parent_name: parentNameVal,
            parent_email: parentEmailVal,
            parent_phone: parentPhoneVal,
            address: addressVal,
            previous_school: prevSchoolVal,
            notes: notesVal,
            status: 'pending'
          }
        ]);

      if (error) {
        throw error;
      }

      // Success feedback
      showStatusBanner(
        statusMsg,
        'success',
        'Application Submitted Successfully!',
        'Thank you! Your admission application has been registered with reference to our admissions desk. We will review your application and get in touch with you.'
      );

      // Reset form fields
      form.reset();
      [
        childNameInput, dobInput, classInput, parentNameInput,
        parentEmailInput, parentPhoneInput, addressInput,
        previousSchoolInput, notesInput
      ].forEach(f => {
        if (f) clearFieldError(f, null);
      });

    } catch (err) {
      console.error('Admission form submission error:', err);
      showStatusBanner(
        statusMsg,
        'error',
        'Submission Failed',
        'There was an unexpected error processing your application. Please check your network connection and try again, or contact admissions directly.'
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initAdmissionForm();
});
