(() => {
  const status = document.querySelector('[data-copy-status]');
  let statusTimer;
  document.querySelectorAll('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      const email = button.dataset.copyEmail;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(email);
        button.textContent = 'Copied';
        if (status) status.textContent = 'Email address copied.';
      } catch {
        const link = button.parentElement.querySelector('a');
        if (link) {
          const range = document.createRange();
          range.selectNodeContents(link);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        if (status) status.textContent = 'Email selected. Press Ctrl+C or ⌘C to copy.';
      }
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        button.textContent = 'Copy';
        if (status) status.textContent = '';
      }, 2400);
    });
  });

  const sectionLinks = [...document.querySelectorAll('[data-section]')];
  const sections = sectionLinks.map(link => document.getElementById(link.dataset.section)).filter(Boolean);
  if (sections.length) {
    let queued = false;
    function updateSection() {
      const line = window.innerHeight * 0.35;
      let current = '';
      sections.forEach(section => { if (section.getBoundingClientRect().top <= line) current = section.id; });
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) current = 'contact';
      sectionLinks.forEach(link => {
        if (link.dataset.section === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      queued = false;
    }
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(updateSection); }
    }, { passive: true });
    window.addEventListener('resize', updateSection);
    updateSection();
  }
})();
