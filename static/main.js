// Navigation toggle for small screens
document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', (!expanded).toString());
      navLinks.classList.toggle('open');
    });
  }

  // Login modal behavior
  var loginBtn = document.getElementById('loginBtn');
  var loginModal = document.getElementById('loginModal');
  var modalClose = document.getElementById('modalClose');
  var cancelBtn = document.getElementById('cancelBtn');
  var roleTabs = document.querySelectorAll('.role-tab');
  var portalInput = document.getElementById('portalInput');

  function openModal() {
    if (!loginModal) return;
    loginModal.classList.add('open');
    loginModal.setAttribute('aria-hidden', 'false');
    // focus first input
    var firstInput = loginModal.querySelector('input[name="username"]');
    if (firstInput) firstInput.focus();
      // focus trap: save previously focused element
      previousActive = document.activeElement;
      setTimeout(function(){
        var focusables = loginModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusables = Array.prototype.filter.call(focusables, function(el){ return !el.hasAttribute('disabled'); });
        firstFocusable = focusables[0];
        lastFocusable = focusables[focusables.length-1];
        if (firstFocusable) firstFocusable.focus();
      }, 10);
  }

  function closeModal() {
    if (!loginModal) return;
    loginModal.classList.remove('open');
    loginModal.setAttribute('aria-hidden', 'true');
      // restore focus
      if (previousActive) previousActive.focus();
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', openModal);
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // close on overlay click
  if (loginModal) {
    loginModal.addEventListener('click', function (e) {
      if (e.target === loginModal) closeModal();
    });
  }

  // Esc to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

    // Trap tab focus inside modal when open
    var previousActive = null, firstFocusable = null, lastFocusable = null;
    document.addEventListener('keydown', function (e) {
      if (!loginModal || !loginModal.classList.contains('open')) return;
      if (e.key === 'Tab') {
        if (!firstFocusable) return;
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault(); lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault(); firstFocusable.focus();
          }
        }
      }
      // left/right arrows for role tabs
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        var focused = document.activeElement;
        if (focused && focused.classList && focused.classList.contains('role-tab')) {
          e.preventDefault();
          var idx = Array.prototype.indexOf.call(roleTabs, focused);
          if (e.key === 'ArrowLeft') idx = Math.max(0, idx-1); else idx = Math.min(roleTabs.length-1, idx+1);
          roleTabs[idx].focus(); roleTabs[idx].click();
        }
      }
    });

  // role tab switch
  roleTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      roleTabs.forEach(function (t) { t.classList.remove('active'); });
      this.classList.add('active');
      var role = this.getAttribute('data-role');
      if (portalInput) portalInput.value = role;
    });
  });

  // Auto-open modal when visiting /login or url contains ?portal=
  try {
    var params = new URLSearchParams(window.location.search);
    var requested = params.get('portal');
    if (window.location.pathname === '/login' || requested) {
      // if a portal was requested, pre-select the correct tab
      if (requested) {
        roleTabs.forEach(function (t) { t.classList.remove('active'); if (t.getAttribute('data-role') === requested) t.classList.add('active'); });
        if (portalInput) portalInput.value = requested;
      }
      openModal();
    }
  } catch (e) { /* ignore in older browsers */ }
});

// Multi-step admissions, file-drop, validation, and toasts
document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('multiForm');
  if(!form) return;
  var steps = Array.from(form.querySelectorAll('.form-step'));
  var stepIndexEl = document.getElementById('stepIndex');
  var progressBar = document.getElementById('progressBar');
  var backBtn = document.getElementById('backBtn');
  var nextBtn = document.getElementById('nextBtn');
  var submitBtn = document.getElementById('submitBtn');
  var toast = document.getElementById('toast');
  var fileInput = document.getElementById('fileInput');
  var dropZone = document.getElementById('dropZone');
  var fileList = document.getElementById('fileList');
  var reviewBox = document.getElementById('reviewBox');
  var payBadge = document.getElementById('payBadge');
  var courseSelect = document.getElementById('app-course');
  var coursePreview = document.getElementById('coursePreview');

  function ensureCoursePlaceholder(){
    if(!courseSelect) return;
    var placeholder = courseSelect.querySelector('option[value=""]');
    if(!placeholder){
      placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a program';
    }
    courseSelect.innerHTML = '';
    courseSelect.appendChild(placeholder);
  }

  function populateCourses(data){
    if(!courseSelect) return;
    ensureCoursePlaceholder();
    data.forEach(function(c){
      var opt = document.createElement('option');
      opt.value = c.title;
      opt.textContent = c.title + ' (' + c.level + ')';
      courseSelect.appendChild(opt);
    });
  }

  var current = 0;
  function showStep(i){
    steps.forEach(function(s, idx){ s.style.display = idx===i ? '' : 'none'; });
    if(stepIndexEl) stepIndexEl.textContent = i+1;
    if(progressBar) progressBar.style.width = String(((i+1)/steps.length)*100)+'%';
    if(backBtn) backBtn.disabled = i===0;
    if(nextBtn) nextBtn.style.display = i < steps.length-1 ? '' : 'none';
    if(submitBtn) submitBtn.style.display = i === steps.length-1 ? '' : 'none';
  }
  showStep(current);

  if(backBtn) backBtn.addEventListener('click', function(){ if(current>0){ current--; showStep(current); } });
  if(nextBtn) nextBtn.addEventListener('click', function(){
    // basic validation for required fields on current step
    var valid = true;
    var inputs = steps[current].querySelectorAll('input[required], select[required]');
    inputs.forEach(function(i){ if(!i.value) { valid = false; i.classList.add('invalid'); } else { i.classList.remove('invalid'); } });
    if(!valid){ showToast('Please fill required fields'); return; }
    if(current < steps.length-1){ current++; showStep(current); if(current===1) renderCoursePreview(); }
  });

  // load courses for admissions select
  if(courseSelect){
    ensureCoursePlaceholder();
    fetch('/static/data/courses.json').then(function(r){ return r.json(); }).then(function(data){
      window._courses = data;
      populateCourses(data);
      // preselect from query string (?course=)
      try{
        var params = new URLSearchParams(window.location.search);
        var requested = params.get('course');
        if(requested){
          courseSelect.value = requested;
          renderCoursePreview();
        }
      }catch(e){}
    }).catch(function(){
      if(coursePreview){
        coursePreview.innerHTML = '<div class="muted">Could not load programs.</div>';
      }
    });
    courseSelect.addEventListener('change', renderCoursePreview);
  }

  // live email validation
  var email = document.getElementById('app-email');
  var emailValid = document.getElementById('email-valid');
  if(email){ email.addEventListener('input', function(){ var ok = /\S+@\S+\.\S+/.test(email.value); if(emailValid){ emailValid.textContent = ok ? '✅ Email looks good' : (email.value ? '✖ Invalid email' : ''); emailValid.style.color = ok ? 'var(--success)' : 'var(--danger)'; } }); }

  // file drop
  function addFileItem(file){
    if(!fileList) return;
    var item = document.createElement('div'); item.className = 'file-item';
    var left = document.createElement('div'); left.className='name'; left.textContent = file.name + ' ('+Math.round(file.size/1024)+' KB)';
    var right = document.createElement('div');
    var rm = document.createElement('button'); rm.className='btn btn-outline'; rm.textContent='Remove'; rm.addEventListener('click', function(){ item.remove(); });
    right.appendChild(rm);
    item.appendChild(left); item.appendChild(right);
    if(file.type && file.type.startsWith && file.type.startsWith('image/')){
      var img = document.createElement('img'); img.className='file-preview'; img.src = URL.createObjectURL(file); img.onload = function(){ URL.revokeObjectURL(this.src); };
      item.insertBefore(img, left);
    }
    fileList.appendChild(item);
  }
  if(dropZone && fileInput){
    dropZone.addEventListener('click', function(){ fileInput.click(); });
    dropZone.addEventListener('dragover', function(e){ e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function(e){ dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e){ e.preventDefault(); dropZone.classList.remove('dragover'); var files = e.dataTransfer.files; Array.from(files).forEach(addFileItem); });
    fileInput.addEventListener('change', function(e){ Array.from(e.target.files).forEach(addFileItem); });
    var pick = document.getElementById('pickFiles'); if(pick) pick.addEventListener('click', function(){ fileInput.click(); });
  }

  // review content
  function renderCoursePreview(){
    var csel = courseSelect;
    var box = coursePreview;
    if(!csel || !box) return;
    box.innerHTML = '';
    var val = csel.value;
    if(val){
      var details = (window._courses || []).find(function(c){ return c.title === val; });
      var el = document.createElement('div');
      el.className = 'card';
      if(details){
        el.innerHTML = '<strong>'+val+'</strong><div class="muted">'+details.stream+' · '+details.duration+' · '+details.fee+'</div>';
      } else {
        el.innerHTML = '<strong>'+val+'</strong><div class="muted">Selected program</div>';
      }
      box.appendChild(el);
    }
  }

  // submit handler (mock payment & success)
  form.addEventListener('submit', function(e){ e.preventDefault(); if(payBadge){ payBadge.textContent = '⏳ Processing'; payBadge.className='text-info'; } showToast('Processing payment...'); setTimeout(function(){ if(payBadge){ payBadge.textContent = '✅ Paid'; payBadge.className='text-success'; } showToast('✅ Payment Successful'); }, 1400); });

  function showToast(msg){ if(!toast) return; toast.textContent = msg; toast.style.display = 'block'; toast.style.opacity = 0; setTimeout(function(){ toast.style.opacity=1; },10); setTimeout(function(){ toast.style.opacity=0; setTimeout(function(){ toast.style.display='none'; },250); },2600); }
});
// UI enhancements: sticky header shadow, back-to-top button, theme toggle, card reveal
document.addEventListener('DOMContentLoaded', function(){
  var header = document.getElementById('site-header');
  var back = document.getElementById('backToTop');
  var themeBtn = document.getElementById('themeToggle');

  // sticky header shadow on scroll
  function onScroll(){
    if(window.scrollY > 12) header.classList.add('scrolled'); else header.classList.remove('scrolled');
    if(window.scrollY > 400) back.classList.add('visible'); else back.classList.remove('visible');
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  // back to top
  if(back){ back.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); }); }

  // theme toggle (light/dark)
  function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem('site-theme', t); themeBtn.textContent = t === 'dark' ? '☀️' : '🌙'; }
  try{ var saved = localStorage.getItem('site-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); applyTheme(saved); }catch(e){}
  if(themeBtn){ themeBtn.addEventListener('click', function(){ var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; applyTheme(cur); }); }

  // reveal cards on scroll
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('reveal'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.card').forEach(function(c){ observer.observe(c); c.classList.add('will-reveal'); });
});
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // close when clicking outside on mobile
  document.addEventListener('click', function (e) {
    if (!links.classList.contains('open')) return;
    if (e.target === btn || links.contains(e.target)) return;
    links.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });
});

// Courses: fetch and render
document.addEventListener('DOMContentLoaded', function () {
  var list = document.getElementById('courses-list');
  var template = document.getElementById('course-template');
  var search = document.getElementById('course-search');
  var stream = document.getElementById('stream-filter');
  if (!list || !template) return;

  function renderCourses(data){
    list.innerHTML = '';
    data.forEach(function(c){
      var node = template.content.cloneNode(true);
      node.querySelector('.course-title').textContent = c.title + ' ('+c.level+')';
      node.querySelector('.course-meta').textContent = c.stream + ' · ' + c.duration + ' · ' + c.fee;
      node.querySelector('.course-desc').textContent = c.desc + ' Eligibility: ' + c.eligibility + '. Career: ' + c.career + '.';
      // set apply link to preselect course on admissions page
      var applyBtn = node.querySelector('.course-apply');
      if(applyBtn){
        applyBtn.setAttribute('href', '/admissions?course=' + encodeURIComponent(c.title));
      }
      // optional syllabus link placeholder
      var syllabus = node.querySelector('a[href="#"]');
      if(syllabus){
        syllabus.setAttribute('href', '/static/syllabus/' + encodeURIComponent(c.title.replace(/\s+/g,'_')) + '.pdf');
      }
      list.appendChild(node);
    });
  }

  fetch('/static/data/courses.json').then(function(r){ return r.json(); }).then(function(data){
    window._courses = data;
    renderCourses(data);
  }).catch(function(){ list.innerHTML = '<div class="card muted">Could not load courses.</div>'; });

  function applyFilters(){
    var q = (search && search.value || '').toLowerCase();
    var s = (stream && stream.value || '');
    var out = (window._courses || []).filter(function(c){
      var ok = true;
      if (s) ok = c.stream === s;
      if (q) ok = ok && (c.title.toLowerCase().indexOf(q) !== -1 || c.desc.toLowerCase().indexOf(q) !== -1);
      return ok;
    });
    renderCourses(out);
  }

  if (search) search.addEventListener('input', applyFilters);
  if (stream) stream.addEventListener('change', applyFilters);
});
