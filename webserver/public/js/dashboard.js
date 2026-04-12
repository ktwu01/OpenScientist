// Dashboard page logic — warm academic design matching review-batch
(async function () {
  var session = await window.app.getSession();
  if (!session) {
    window.location.href = '/';
    return;
  }

  var token = session.access_token;

  // Check profile exists
  var profile = await window.app.requireProfile();
  if (!profile) return;

  document.getElementById('loading').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // --- Tabs ---
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // --- Profile Tab ---
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

  // --- Research Skills Tab ---
  await loadSkills();

  async function loadSkills() {
    var statsEl = document.getElementById('skills-stats');
    var contentEl = document.getElementById('skills-content');

    try {
      var res = await fetch('/api/skills', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var skills = await res.json();

      if (skills.length === 0) {
        contentEl.textContent = '';
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        var p1 = document.createElement('p');
        p1.textContent = 'No research skills yet.';
        empty.appendChild(p1);
        var p2 = document.createElement('p');
        var t1 = document.createTextNode('Run ');
        p2.appendChild(t1);
        var code = document.createElement('code');
        code.textContent = '/extract-knowhow';
        p2.appendChild(code);
        var t2 = document.createTextNode(' in Claude Code or Codex CLI to get started.');
        p2.appendChild(t2);
        empty.appendChild(p2);
        contentEl.appendChild(empty);
        return;
      }

      // Render stats
      renderStats(statsEl, skills);

      // Group by batch_id (or ungrouped)
      var groups = {};
      skills.forEach(function (skill) {
        var key = skill.batch_id || '__single_' + skill.id;
        if (!groups[key]) {
          groups[key] = {
            batch_id: skill.batch_id,
            domain: skill.domain,
            subdomain: skill.subdomain,
            skills: [],
            latest: skill.updated_at,
          };
        }
        groups[key].skills.push(skill);
        if (skill.updated_at > groups[key].latest) {
          groups[key].latest = skill.updated_at;
        }
      });

      // Sort by latest updated
      var sorted = Object.values(groups).sort(function (a, b) {
        return b.latest > a.latest ? 1 : -1;
      });

      contentEl.textContent = '';
      sorted.forEach(function (group) {
        contentEl.appendChild(renderBatchGroup(group));
      });

    } catch (err) {
      contentEl.textContent = 'Error loading skills: ' + err.message;
    }
  }

  function renderStats(container, skills) {
    container.textContent = '';

    var counts = { procedural: 0, semantic: 0, episodic: 0 };
    var draftCount = 0;
    var submittedCount = 0;

    skills.forEach(function (s) {
      var mt = s.memory_type || '';
      if (counts[mt] !== undefined) counts[mt]++;
      if (s.status === 'draft') draftCount++;
      if (s.status === 'submitted') submittedCount++;
    });

    // Stat cards
    var statsRow = document.createElement('div');
    statsRow.className = 'skills-summary';

    var cards = [
      { num: skills.length, label: 'Total Skills' },
      { num: counts.procedural, label: 'Procedural' },
      { num: counts.semantic, label: 'Semantic' },
      { num: counts.episodic, label: 'Episodic' },
    ];

    cards.forEach(function (c) {
      var card = document.createElement('div');
      card.className = 'stat-card';
      var num = document.createElement('span');
      num.className = 'stat-num';
      num.textContent = c.num;
      card.appendChild(num);
      var label = document.createElement('span');
      label.className = 'stat-label';
      label.textContent = c.label;
      card.appendChild(label);
      statsRow.appendChild(card);
    });
    container.appendChild(statsRow);

    // Summary bar
    var total = skills.length;
    if (total > 0) {
      var bar = document.createElement('div');
      bar.className = 'summary-bar';
      ['procedural', 'semantic', 'episodic'].forEach(function (type) {
        if (counts[type] > 0) {
          var seg = document.createElement('div');
          seg.className = 'seg-' + type;
          seg.style.width = ((counts[type] / total) * 100) + '%';
          bar.appendChild(seg);
        }
      });
      container.appendChild(bar);

      var legend = document.createElement('div');
      legend.className = 'legend';
      var colors = { procedural: '#4f7a63', semantic: '#5b6c8b', episodic: '#7b5b92' };
      ['procedural', 'semantic', 'episodic'].forEach(function (type) {
        var item = document.createElement('span');
        var dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = colors[type];
        item.appendChild(dot);
        item.appendChild(document.createTextNode(
          type.charAt(0).toUpperCase() + type.slice(1) + ' (' + counts[type] + ')'
        ));
        legend.appendChild(item);
      });
      container.appendChild(legend);
    }
  }

  function renderBatchGroup(group) {
    var card = document.createElement('div');
    card.className = 'batch-group';

    var header = document.createElement('div');
    header.className = 'batch-header';

    var headerLeft = document.createElement('div');
    headerLeft.style.display = 'flex';
    headerLeft.style.alignItems = 'center';
    headerLeft.style.gap = '12px';
    headerLeft.style.flex = '1';
    headerLeft.style.minWidth = '0';

    var chevron = document.createElement('span');
    chevron.className = 'chevron';
    headerLeft.appendChild(chevron);

    var title = document.createElement('h3');
    if (group.batch_id) {
      var domainText = [group.domain, group.subdomain].filter(Boolean).join(' / ') || 'Ungrouped';
      var date = new Date(group.latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      title.textContent = domainText + ' \u2014 ' + date;
    } else {
      var data = group.skills[0].data || {};
      title.textContent = data.name || group.skills[0].subtype || 'Single skill';
    }
    headerLeft.appendChild(title);
    header.appendChild(headerLeft);

    var meta = document.createElement('div');
    meta.className = 'batch-meta-info';

    // Count per type
    var typeCounts = { procedural: 0, semantic: 0, episodic: 0 };
    var draftCount = 0;
    var submittedCount = 0;
    group.skills.forEach(function (s) {
      var mt = s.memory_type || '';
      if (typeCounts[mt] !== undefined) typeCounts[mt]++;
      if (s.status === 'draft') draftCount++;
      if (s.status === 'submitted') submittedCount++;
    });

    var countSpan = document.createElement('span');
    countSpan.className = 'batch-count';
    countSpan.textContent = group.skills.length + ' skill' + (group.skills.length > 1 ? 's' : '');
    meta.appendChild(countSpan);

    // Mini type badges
    ['procedural', 'semantic', 'episodic'].forEach(function (type) {
      if (typeCounts[type] > 0) {
        var badge = document.createElement('span');
        badge.className = 'memory-badge memory-' + type;
        badge.textContent = typeCounts[type] + ' ' + type.charAt(0).toUpperCase();
        meta.appendChild(badge);
      }
    });

    if (draftCount > 0) {
      var dBadge = document.createElement('span');
      dBadge.className = 'status-badge status-draft';
      dBadge.textContent = draftCount + ' draft';
      meta.appendChild(dBadge);
    }
    if (submittedCount > 0) {
      var sBadge = document.createElement('span');
      sBadge.className = 'status-badge status-submitted';
      sBadge.textContent = submittedCount + ' submitted';
      meta.appendChild(sBadge);
    }

    // Review batch link
    if (group.batch_id) {
      var reviewLink = document.createElement('a');
      reviewLink.href = '/review/batch/' + group.batch_id;
      reviewLink.className = 'btn btn-sm btn-secondary';
      reviewLink.textContent = 'Review Batch';
      reviewLink.addEventListener('click', function (e) { e.stopPropagation(); });
      meta.appendChild(reviewLink);
    }

    header.appendChild(meta);
    card.appendChild(header);

    // Skill rows
    var skillList = document.createElement('div');
    skillList.className = 'skill-list';

    header.addEventListener('click', function () {
      skillList.classList.toggle('open');
      header.classList.toggle('expanded');
    });

    group.skills.forEach(function (skill) {
      var data = skill.data || {};

      var row = document.createElement('div');
      row.className = 'skill-row';

      var info = document.createElement('div');
      info.className = 'skill-row-info';

      var memBadge = document.createElement('span');
      memBadge.className = 'memory-badge memory-' + (skill.memory_type || '');
      memBadge.textContent = skill.memory_type || '';
      info.appendChild(memBadge);

      var subBadge = document.createElement('span');
      subBadge.className = 'subtype-badge';
      subBadge.textContent = skill.subtype || '';
      info.appendChild(subBadge);

      var nameSpan = document.createElement('span');
      nameSpan.className = 'skill-name';
      nameSpan.textContent = data.name || skill.subtype || 'Unnamed';
      info.appendChild(nameSpan);

      var statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge status-' + (skill.status || 'draft');
      statusBadge.textContent = skill.status || 'draft';
      info.appendChild(statusBadge);

      var dateSpan = document.createElement('span');
      dateSpan.className = 'skill-date';
      dateSpan.textContent = new Date(skill.updated_at).toLocaleDateString();
      info.appendChild(dateSpan);

      row.appendChild(info);

      var actions = document.createElement('div');
      actions.className = 'skill-row-actions';

      var openBtn = document.createElement('a');
      openBtn.href = '/review/skill/' + skill.id;
      openBtn.className = 'btn btn-sm btn-secondary';
      openBtn.textContent = 'Open';
      actions.appendChild(openBtn);

      if (skill.status === 'draft') {
        var delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          if (!confirm('Delete this draft skill? This cannot be undone.')) return;
          try {
            var delRes = await fetch('/api/skills/' + skill.id, {
              method: 'DELETE',
              headers: { Authorization: 'Bearer ' + token },
            });
            if (!delRes.ok) throw new Error('HTTP ' + delRes.status);
            await loadSkills();
          } catch (err) {
            alert('Delete failed: ' + err.message);
          }
        });
        actions.appendChild(delBtn);
      }

      row.appendChild(actions);
      skillList.appendChild(row);
    });

    card.appendChild(skillList);
    return card;
  }
})();
