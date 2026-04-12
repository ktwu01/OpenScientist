// Dashboard — sidebar with project tabs + horizontal memory sections + subtype groups
// Shares layout design with review-batch
'use strict';

(async function () {
  var session = await window.app.getSession();
  if (!session) {
    window.location.href = '/';
    return;
  }

  var token = session.access_token;
  var profile = await window.app.requireProfile();
  if (!profile) return;

  document.getElementById('loading').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // --- Profile form ---
  document.getElementById('prof-name').value = profile.full_name || '';
  document.getElementById('prof-affiliation').value = profile.affiliation || '';
  document.getElementById('prof-role').value = profile.role || '';
  document.getElementById('prof-homepage').value = profile.homepage_url || '';

  document.getElementById('profile-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var msgEl = document.getElementById('profile-message');
    msgEl.style.display = 'none';
    var body = {
      full_name: document.getElementById('prof-name').value.trim(),
      affiliation: document.getElementById('prof-affiliation').value.trim(),
      role: document.getElementById('prof-role').value,
      homepage_url: document.getElementById('prof-homepage').value.trim(),
    };
    try {
      var res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      msgEl.textContent = 'Profile saved.';
      msgEl.className = 'form-message success';
      msgEl.style.display = 'block';
    } catch (err) {
      msgEl.textContent = 'Save failed: ' + err.message;
      msgEl.className = 'form-message error';
      msgEl.style.display = 'block';
    }
  });

  // --- Load skills ---
  var allSkills = [];
  try {
    var res = await fetch('/api/skills', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    allSkills = await res.json();
  } catch (err) {
    document.getElementById('skills-display').textContent = 'Error loading skills: ' + err.message;
    return;
  }

  renderSidebar(allSkills, profile);
  if (allSkills.length > 0) {
    renderSkillsByProject(allSkills);
  } else {
    var display = document.getElementById('skills-display');
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    var p1 = document.createElement('p');
    p1.textContent = 'No research skills yet.';
    empty.appendChild(p1);
    var p2 = document.createElement('p');
    p2.appendChild(document.createTextNode('Run '));
    var code = document.createElement('code');
    code.textContent = '/extract-knowhow';
    p2.appendChild(code);
    p2.appendChild(document.createTextNode(' in Claude Code or Codex CLI to get started.'));
    empty.appendChild(p2);
    display.appendChild(empty);
  }

  // --- Sidebar ---
  function renderSidebar(skills, prof) {
    var sidebar = document.getElementById('sidebar');
    sidebar.textContent = '';

    // Header
    var header = document.createElement('div');
    header.className = 'sidebar-header';
    var h2 = document.createElement('h2');
    h2.textContent = 'Dashboard';
    header.appendChild(h2);
    var meta = document.createElement('div');
    meta.className = 'sidebar-meta';
    meta.textContent = (prof.full_name || 'Researcher') + ' \u00B7 ' + skills.length + ' skills';
    header.appendChild(meta);
    sidebar.appendChild(header);

    // Navigation tabs: Skills and Profile
    var tabs = document.createElement('ul');
    tabs.className = 'project-tabs';

    var skillsTab = createTab('Skills', skills.length, true);
    skillsTab.addEventListener('click', function () {
      setActiveTab(tabs, skillsTab);
      showSkillsTab();
      renderSkillsByProject(skills);
    });
    tabs.appendChild(skillsTab);

    var profileTab = createTab('Profile', null, false);
    profileTab.addEventListener('click', function () {
      setActiveTab(tabs, profileTab);
      document.getElementById('tab-skills').style.display = 'none';
      document.getElementById('tab-profile').style.display = 'block';
    });
    tabs.appendChild(profileTab);

    sidebar.appendChild(tabs);
  }

  function createTab(label, count, active) {
    var tab = document.createElement('li');
    tab.className = 'project-tab' + (active ? ' active' : '');
    tab.appendChild(document.createTextNode(label));
    if (count !== null) {
      var cnt = document.createElement('span');
      cnt.className = 'project-tab-count';
      cnt.textContent = count;
      tab.appendChild(cnt);
    }
    return tab;
  }

  function setActiveTab(tabList, activeTab) {
    var tabs = tabList.querySelectorAll('.project-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    activeTab.classList.add('active');
  }

  function showSkillsTab() {
    document.getElementById('tab-skills').style.display = 'block';
    document.getElementById('tab-profile').style.display = 'none';
  }

  // --- Render skills grouped by project, then by memory_type/subtype ---
  function renderSkillsByProject(skills) {
    var display = document.getElementById('skills-display');
    display.textContent = '';

    if (skills.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      var p = document.createElement('p');
      p.textContent = 'No skills yet.';
      empty.appendChild(p);
      display.appendChild(empty);
      return;
    }

    // Group by project
    var projects = {};
    skills.forEach(function (s) {
      var d = s.data || {};
      var slug = d.project_slug || '__ungrouped__';
      if (!projects[slug]) {
        projects[slug] = {
          name: d.project_name || d.project_slug || 'Ungrouped',
          skills: [],
        };
      }
      projects[slug].skills.push(s);
    });

    var projectKeys = Object.keys(projects);
    projectKeys.forEach(function (slug) {
      var proj = projects[slug];

      // Project section
      var projSection = document.createElement('div');
      projSection.className = 'project-section';

      var projHeader = document.createElement('div');
      projHeader.className = 'project-section-header';
      var projTitle = document.createElement('h2');
      projTitle.className = 'project-section-title';
      projTitle.textContent = proj.name;
      projHeader.appendChild(projTitle);
      var projCount = document.createElement('span');
      projCount.className = 'project-section-count';
      projCount.textContent = proj.skills.length + ' skill' + (proj.skills.length > 1 ? 's' : '');
      projHeader.appendChild(projCount);
      projSection.appendChild(projHeader);

      // Within project, group by memory_type then subtype
      renderSkillsInSection(projSection, proj.skills);

      display.appendChild(projSection);
    });
  }

  function renderSkillsInSection(container, skills) {
    var grouped = { procedural: [], semantic: [], episodic: [] };
    skills.forEach(function (s) {
      var mt = s.memory_type || '';
      if (grouped[mt]) grouped[mt].push(s);
    });

    ['procedural', 'semantic', 'episodic'].forEach(function (type) {
      var list = grouped[type];
      if (list.length === 0) return;

      var section = document.createElement('div');
      section.className = 'memory-section type-' + type;

      var header = document.createElement('div');
      header.className = 'memory-section-header';
      var titleEl = document.createElement('h2');
      titleEl.className = 'memory-section-title';
      titleEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      header.appendChild(titleEl);
      var countEl = document.createElement('span');
      countEl.className = 'memory-section-count';
      countEl.textContent = list.length + ' skill' + (list.length > 1 ? 's' : '');
      header.appendChild(countEl);
      section.appendChild(header);

      // Group by subtype
      var bySubtype = {};
      list.forEach(function (s) {
        var st = (s.data && s.data.subtype) || s.subtype || 'other';
        if (!bySubtype[st]) bySubtype[st] = [];
        bySubtype[st].push(s);
      });

      var order = SUBTYPE_ORDER[type] || [];
      var subtypeKeys = order.filter(function (k) { return bySubtype[k]; });
      Object.keys(bySubtype).forEach(function (k) {
        if (subtypeKeys.indexOf(k) === -1) subtypeKeys.push(k);
      });

      subtypeKeys.forEach(function (st) {
        var group = document.createElement('div');
        group.className = 'subtype-group';

        var groupHeader = document.createElement('div');
        groupHeader.className = 'subtype-group-header';
        groupHeader.textContent = st.replace(/-/g, ' ') + ' (' + bySubtype[st].length + ')';
        group.appendChild(groupHeader);

        var cards = document.createElement('div');
        cards.className = 'skill-cards';

        bySubtype[st].forEach(function (skill) {
          cards.appendChild(createSkillCard(skill, type));
        });

        group.appendChild(cards);
        section.appendChild(group);
      });

      container.appendChild(section);
    });
  }

  // --- Section parser (shared with review-batch) ---
  function parseSections(body) {
    if (!body) return [];
    var sections = [];
    var parts = body.split(/^## /m).filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      var lines = parts[i].split('\n');
      sections.push({ title: lines[0].trim(), content: lines.slice(1).join('\n').trim() });
    }
    return sections;
  }

  function getPreview(body) {
    var sections = parseSections(body);
    if (sections.length === 0) return '';
    return (sections[0].content.split('\n')[0] || '').substring(0, 150);
  }

  // --- Skills display ---
  var SUBTYPE_ORDER = {
    procedural: ['tie', 'no-change', 'constraint-failure', 'operator-fail'],
    semantic: ['frontier', 'non-public', 'correction'],
    episodic: ['failure', 'adaptation', 'anomalous'],
  };

  function createSkillCard(skill, memoryType) {
    var data = skill.data || {};
    var card = document.createElement('div');
    card.className = 'skill-card';

    var badge = document.createElement('div');
    badge.className = 'subtype-badge';
    badge.textContent = data.subtype || skill.subtype || '';
    card.appendChild(badge);

    var name = document.createElement('div');
    name.className = 'skill-name';
    name.textContent = data.name || '(unnamed)';
    card.appendChild(name);

    var preview = document.createElement('div');
    preview.className = 'skill-preview';
    preview.textContent = getPreview(data.body);
    card.appendChild(preview);

    card.addEventListener('click', function () { openExpanded(skill); });
    return card;
  }

  // --- Expanded overlay ---
  function openExpanded(skill) {
    var data = skill.data || {};
    var memoryType = data.memory_type || skill.memory_type || '';
    var sections = parseSections(data.body);

    var card = document.getElementById('expanded-card');
    while (card.firstChild) card.removeChild(card.firstChild);

    var header = document.createElement('div');
    header.className = 'expanded-header';

    var headerLeft = document.createElement('div');
    var h2 = document.createElement('h2');
    h2.textContent = data.name || '(unnamed)';
    headerLeft.appendChild(h2);

    var badges = document.createElement('div');
    badges.className = 'badges';
    var memBadge = document.createElement('span');
    memBadge.className = 'badge badge-' + memoryType;
    memBadge.textContent = memoryType;
    badges.appendChild(memBadge);
    var subBadge = document.createElement('span');
    subBadge.className = 'badge badge-subtype';
    subBadge.textContent = data.subtype || skill.subtype || '';
    badges.appendChild(subBadge);
    headerLeft.appendChild(badges);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeExpanded(); });

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);
    card.appendChild(header);

    var body = document.createElement('div');
    body.className = 'expanded-body';

    if (memoryType === 'episodic') {
      renderEpisodicExpanded(body, sections);
    } else {
      renderStandardExpanded(body, sections, memoryType);
    }
    card.appendChild(body);

    document.getElementById('overlay').classList.add('active');
  }

  function closeExpanded() {
    document.getElementById('overlay').classList.remove('active');
  }

  document.getElementById('overlay').addEventListener('click', function (e) {
    if (e.target === this) closeExpanded();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeExpanded();
  });

  function renderStandardExpanded(container, sections, memoryType) {
    sections.forEach(function (sec) {
      var block = document.createElement('div');
      block.className = 'section-block';
      if (memoryType === 'procedural' && sec.title.toLowerCase() === 'decision') {
        block.classList.add('highlight-decision');
      }
      var title = document.createElement('div');
      title.className = 'section-block-title';
      title.textContent = sec.title;
      block.appendChild(title);
      var content = document.createElement('div');
      content.className = 'section-block-content';
      content.textContent = sec.content;
      block.appendChild(content);
      container.appendChild(block);
    });
  }

  function renderEpisodicExpanded(container, sections) {
    var timelineHeaders = ['situation', 'action', 'outcome'];
    var timelineSections = [];
    var otherSections = [];

    sections.forEach(function (sec) {
      if (timelineHeaders.indexOf(sec.title.toLowerCase()) !== -1) {
        timelineSections.push(sec);
      } else {
        otherSections.push(sec);
      }
    });

    if (timelineSections.length > 0) {
      var flow = document.createElement('div');
      flow.className = 'timeline-flow';
      timelineSections.forEach(function (sec) {
        var step = document.createElement('div');
        step.className = 'timeline-step';
        var hdr = document.createElement('div');
        hdr.className = 'timeline-step-header';
        hdr.textContent = sec.title;
        step.appendChild(hdr);
        var bd = document.createElement('div');
        bd.className = 'timeline-step-body';
        bd.textContent = sec.content;
        step.appendChild(bd);
        flow.appendChild(step);
      });
      container.appendChild(flow);
    }

    otherSections.forEach(function (sec) {
      var block = document.createElement('div');
      block.className = 'section-block';
      var title = document.createElement('div');
      title.className = 'section-block-title';
      title.textContent = sec.title;
      block.appendChild(title);
      var content = document.createElement('div');
      content.className = 'section-block-content';
      content.textContent = sec.content;
      block.appendChild(content);
      container.appendChild(block);
    });
  }
})();
