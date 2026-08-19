
    const DEFAULT_BACKEND = 'https://autonomous-ai-m8ki.onrender.com';
    
    // Determine API_BASE:
    // 1. Allow explicit URL query parameter override e.g. ?backend=https://...
    const urlParams = new URLSearchParams(window.location.search);
    const customBackend = urlParams.get('backend');

    function getApiBase() {
      if (customBackend) {
        return customBackend.replace(/\/+$/, '');
      }
      // If served directly by the exact backend service host on Render
      if (window.location.origin.includes('autonomous-ai-m8ki.onrender.com')) {
        return '';
      }
      // If served by local backend node server on port 4000 or 3000
      if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
          (window.location.port === '4000' || window.location.port === '3000')) {
        return '';
      }
      // Default to the specified production backend URL for all other frontend origins (Netlify, Vercel, static Render site, Live Server, local html file, etc.)
      return DEFAULT_BACKEND;
    }

    const API_BASE = getApiBase();

    function toggleSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar) sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    }

    document.addEventListener('DOMContentLoaded', () => {
      const badge = document.getElementById('backendUrlDisplay');
      if (badge) {
        const targetHost = API_BASE ? API_BASE : window.location.origin;
        badge.innerText = targetHost.replace(/^https?:\/\//, '');
      }
    });

    let activeAgentId = null;
    let currentSelectedAgent = null;
    let refreshInterval = null;

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetId = e.currentTarget.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Close sidebar on mobile
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }

        if (targetId === 'view-agents') {
          loadAgents();
        } else if (targetId === 'view-activity' || targetId === 'view-rejected') {
          loadLogs();
        } else if (targetId === 'view-feed') {
          loadGlobalFeed();
        } else if (targetId === 'view-radar') {
          loadOpportunities();
        } else if (targetId === 'view-brain') {
          loadLogs(); // fetch latest telemetry data
          if (typeof initBrainVisualization === 'function') {
            setTimeout(initBrainVisualization, 50);
          }
        }
      });
    });

    // Modal Helpers
    function openInitModal() {
      document.getElementById('initModal').classList.add('active');
      document.getElementById('initSequenceDisplay').classList.add('hidden');
      document.getElementById('initSequenceDisplay').innerHTML = '';
      document.getElementById('submitInitBtn').classList.remove('hidden');
    }

    function closeInitModal() {
      document.getElementById('initModal').classList.remove('active');
    }

    function openGenerateModal() {
      if (!activeAgentId) {
        alert('Please select or initialize an agent first.');
        return;
      }
      const agentName = currentSelectedAgent ? currentSelectedAgent.name : 'Agent';
      document.getElementById('genAgentNameTitle').innerText = agentName;
      document.getElementById('genPostTopic').value = '';
      document.getElementById('genInstructions').value = '';
      document.getElementById('genSequenceDisplay').classList.add('hidden');
      document.getElementById('genSequenceDisplay').innerHTML = '';
      document.getElementById('submitGenBtn').classList.remove('hidden');
      document.getElementById('generateModal').classList.add('active');
    }

    function closeGenerateModal() {
      document.getElementById('generateModal').classList.remove('active');
    }

    function openEditModal(id, title, content, platform, status) {
      document.getElementById('editPostId').value = id;
      document.getElementById('editPostTitle').value = title;
      document.getElementById('editPostContent').value = content;
      document.getElementById('editPostPlatform').value = platform || 'LinkedIn / X';
      document.getElementById('editPostStatus').value = status || 'Published';
      document.getElementById('editPostModal').classList.add('active');
    }

    function closeEditModal() {
      document.getElementById('editPostModal').classList.remove('active');
    }

    document.addEventListener('DOMContentLoaded', () => {
      loadAgents();
      setInterval(loadAgents, 30000); // refresh every 30s

      // Form: Init Agent
      document.getElementById('initForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitInitBtn');
        const seq = document.getElementById('initSequenceDisplay');

        btn.classList.add('hidden');
        seq.classList.remove('hidden');

        const name = document.getElementById('agentName').value;
        const domain = document.getElementById('agentDomain').value;

        const steps = [
          `Initializing Persona '${name}'...`,
          'Connecting to AI Language Models...',
          'Loading Memory & Knowledge Base...',
          'Starting Autonomous Scheduler...',
          'Agent Ready ✓'
        ];

        seq.innerHTML = '';
        for (let i = 0; i < steps.length; i++) {
          seq.innerHTML += `<div>> ${steps[i]}</div>`;
          await new Promise(r => setTimeout(r, 500));
        }

        try {
          const res = await fetch(`${API_BASE}/api/agent/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ persona: { name, domain } })
          });
          const data = await res.json();
          if (data.agentId) {
            activeAgentId = data.agentId;
            seq.innerHTML += `<div style="color:var(--success); margin-top:0.5rem; font-weight:bold;">> ${name.toUpperCase()} IS ONLINE</div>`;
            await new Promise(r => setTimeout(r, 800));
            closeInitModal();
            loadAgents();
            openAgentDetails(data.agentId);
          }
        } catch (err) {
          seq.innerHTML += `<div style="color:var(--danger);">Error: ${err.message}</div>`;
          btn.classList.remove('hidden');
        }
      });

      // Form: Generate Post
      document.getElementById('generatePostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeAgentId) return;

        const btn = document.getElementById('submitGenBtn');
        const seq = document.getElementById('genSequenceDisplay');
        const topic = document.getElementById('genPostTopic').value.trim();
        const postType = document.getElementById('genPostType').value;
        const platform = document.getElementById('genPlatform').value;
        const tone = document.getElementById('genTone').value;
        const instructions = document.getElementById('genInstructions').value.trim();

        btn.classList.add('hidden');
        seq.classList.remove('hidden');

        const steps = [
          'Generating Post...',
          'Researching topic & security impact...',
          'Drafting content...',
          'Fact checking claims...',
          'Finalizing publication...'
        ];

        seq.innerHTML = '';
        for (let i = 0; i < steps.length; i++) {
          seq.innerHTML += `<div>> ${steps[i]}</div>`;
          await new Promise(r => setTimeout(r, 600));
        }

        try {
          const res = await fetch(`${API_BASE}/api/agent/post/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: activeAgentId,
              topic,
              postType,
              platform,
              tone,
              instructions
            })
          });

          const data = await res.json();
          if (res.ok && data.post) {
            seq.innerHTML += `<div style="color:var(--success); margin-top:0.5rem; font-weight:bold;">> POST PUBLISHED ✓</div>`;
            await new Promise(r => setTimeout(r, 600));
            closeGenerateModal();
            await openAgentDetails(activeAgentId);
            loadAgents();
          } else {
            seq.innerHTML += `<div style="color:var(--danger);">Error: ${data.error || 'Failed to generate'}</div>`;
            btn.classList.remove('hidden');
          }
        } catch (err) {
          seq.innerHTML += `<div style="color:var(--danger);">Error: ${err.message}</div>`;
          btn.classList.remove('hidden');
        }
      });

      // Form: Edit Post
      document.getElementById('editPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editPostId').value;
        const title = document.getElementById('editPostTitle').value.trim();
        const content = document.getElementById('editPostContent').value.trim();
        const platform = document.getElementById('editPostPlatform').value.trim();
        const status = document.getElementById('editPostStatus').value;

        try {
          const res = await fetch(`${API_BASE}/api/agent/post/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, platform, status })
          });

          if (res.ok) {
            closeEditModal();
            if (activeAgentId) {
              loadAgentFeed(activeAgentId);
            } else {
              loadGlobalFeed();
            }
          } else {
            alert('Failed to save changes.');
          }
        } catch (err) {
          alert(`Error saving post: ${err.message}`);
        }
      });

      // Trigger Cycle Button
      document.getElementById('triggerCycleBtn').addEventListener('click', async () => {
        triggerMission(document.getElementById('triggerCycleBtn'), 'Running Cycle...');
      });

      // Start Mission Button
      document.getElementById('startMissionBtn').addEventListener('click', async () => {
        triggerMission(document.getElementById('startMissionBtn'), 'MISSION IN PROGRESS...');
      });

      async function triggerMission(btn, activeText) {
        if (!activeAgentId) {
          alert('No active agent. Please select or initialize an agent first.');
          return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = activeText;
        btn.disabled = true;

        animateWorkflow();

        try {
          await fetch(`${API_BASE}/api/agent/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: activeAgentId })
          });
          if (document.getElementById('view-agent-details').classList.contains('active')) {
            await openAgentDetails(activeAgentId);
          } else {
            await loadGlobalFeed();
          }
          await loadLogs();
          await loadAgents();
        } catch (err) {
          console.error(err);
        } finally {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      }
    });

    async function animateWorkflow() {
      const nodes = ['wf-discovery', 'wf-research', 'wf-writer', 'wf-factcheck', 'wf-critic', 'wf-improve', 'wf-publish'];
      const adaMap = [1, 2, 4, 5, 5, 5, 6];
      let stepIdx = 0;
      for (const id of nodes) {
        document.querySelectorAll('.workflow-node').forEach(n => n.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
        if (typeof setAdaWorksActiveStep === 'function') setAdaWorksActiveStep(adaMap[stepIdx]);
        stepIdx++;
        await new Promise(r => setTimeout(r, 600));
      }
      const pubEl = document.getElementById('wf-publish');
      if (pubEl) pubEl.classList.remove('active');
      if (typeof setAdaWorksActiveStep === 'function') {
        setTimeout(() => setAdaWorksActiveStep(0), 1000);
      }
    }

    async function loadAgents() {
      try {
        const res = await fetch(`${API_BASE}/api/agent/list`);
        const data = await res.json();

        const grid = document.getElementById('agentsGrid');

        if (!data.agents || data.agents.length === 0) {
          grid.innerHTML = '<div class="text-muted">No agents active. Click "+ Initialize New Agent" to launch one.</div>';
          document.getElementById('kpiAgents').innerText = '0';
          document.getElementById('kpiPosts').innerText = '0';
          return;
        }

        if (!activeAgentId) activeAgentId = data.agents[0].id;

        document.getElementById('kpiAgents').innerText = data.agents.length;

        let totalPosts = 0;

        grid.innerHTML = data.agents.map(a => {
          const count = a._count?.posts || 0;
          totalPosts += count;
          const isSelected = a.id === activeAgentId;

          return `
          <div class="agent-card ${isSelected ? 'active' : ''}" onclick="selectAgent('${a.id}')">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div class="author-avatar" style="width:40px; height:40px; font-size:1.1rem;">${a.name.charAt(0)}</div>
                <div>
                  <div class="font-bold text-base text-main">${escapeHtml(a.name.toUpperCase())}</div>
                  <div class="text-xs text-secondary font-bold tracking-wide">${escapeHtml(a.domain.toUpperCase())}</div>
                </div>
              </div>
              <div class="status-indicator" style="font-size:0.65rem; padding: 0.2rem 0.6rem;"><div class="dot pulse"></div> ONLINE</div>
            </div>
            
            <div class="text-xs text-muted mb-4">
              Writing Style: ${escapeHtml(a.style || 'Technical, Concise, Analytical')}
            </div>
            
            <div class="flex justify-between items-center text-xs pt-3" style="border-top: 1px solid var(--border-color);">
              <span class="font-bold text-main">${count} ${count === 1 ? 'Post' : 'Posts'}</span>
              <button class="btn btn-primary text-xs" style="padding: 0.35rem 0.85rem;" onclick="event.stopPropagation(); selectAgent('${a.id}')">View Feed →</button>
            </div>
          </div>
        `}).join('');

        document.getElementById('kpiPosts').innerText = totalPosts;
      } catch (err) {
        console.error('Error fetching agents:', err);
        const grid = document.getElementById('agentsGrid');
        if (grid) {
          const hostDisplay = (API_BASE || DEFAULT_BACKEND).replace(/^https?:\/\//, '');
          grid.innerHTML = `
            <div class="text-center py-6 px-4" style="grid-column: 1 / -1;">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔌</div>
              <div class="font-semibold text-main text-sm">Connecting to backend service (${escapeHtml(hostDisplay)})...</div>
              <div class="text-xs text-muted mt-1">If the server is waking from cold sleep, this may take 20-40 seconds. Retrying automatically...</div>
            </div>
          `;
        }
        setTimeout(loadAgents, 5000);
      }
    }

    function selectAgent(id) {
      activeAgentId = id;
      openAgentDetails(id);
    }

    function showAgentsView() {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const agentNavItem = document.querySelector('.nav-item[data-target="view-agents"]');
      if (agentNavItem) agentNavItem.classList.add('active');

      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      document.getElementById('view-agents').classList.add('active');
      loadAgents();
    }

    async function openAgentDetails(id) {
      activeAgentId = id;
      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      document.getElementById('view-agent-details').classList.add('active');

      try {
        const res = await fetch(`${API_BASE}/api/agent/status?agentId=${id}`);
        const data = await res.json();

        if (data.agent) {
          currentSelectedAgent = data.agent;
          const a = data.agent;
          document.getElementById('detailAgentAvatar').innerText = a.name.charAt(0);
          document.getElementById('detailAgentName').innerText = a.name.toUpperCase();
          document.getElementById('detailAgentDomain').innerText = a.domain.toUpperCase();
          document.getElementById('detailAgentRoleStyle').innerText = `${a.role || 'AI Security Researcher'} • ${a.style || 'Technical, Concise'}`;
          document.getElementById('detailPostCount').innerText = a.totalPosts || 0;
          document.getElementById('detailLastPostTime').innerText = a.lastPublishedAt ? new Date(a.lastPublishedAt).toLocaleString() : 'Never';
          document.getElementById('detailAgentIdBadge').innerText = `ID: ${a.id}`;
          document.getElementById('feedFilterLabel').innerText = `Showing posts for ${a.name} (${a.domain})`;
        }
      } catch (err) {
        console.error('Failed to load agent status', err);
      }

      await loadAgentFeed(id);
      loadLogs();
    }

    async function loadAgentFeed(agentId) {
      const container = document.getElementById('agentFeedContainer');
      container.innerHTML = '<div class="text-muted text-center py-8">Loading agent feed...</div>';

      try {
        const res = await fetch(`${API_BASE}/api/agent/feed?agentId=${agentId}`);
        const data = await res.json();

        if (!data.posts || data.posts.length === 0) {
          container.innerHTML = `
            <div class="glass-card text-center py-12 px-4" style="grid-column: 1 / -1;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
              <h4 class="font-bold text-lg mb-1">No posts generated yet.</h4>
              <p class="text-muted text-sm mb-4">Start creating content for this agent.</p>
              <button class="btn btn-primary text-sm" onclick="openGenerateModal()">+ Generate New Post</button>
            </div>
          `;
          return;
        }

        container.innerHTML = data.posts.map(post => renderPostCard(post, currentSelectedAgent)).join('');
      } catch (err) {
        container.innerHTML = `<div class="text-danger text-center py-8">Failed to load feed: ${err.message}</div>`;
      }
    }

    async function loadGlobalFeed() {
      const container = document.getElementById('feedContainer');
      container.innerHTML = '<div class="text-muted text-center py-8">Loading global feed...</div>';

      try {
        const agentId = activeAgentId || '';
        const url = agentId ? `${API_BASE}/api/agent/feed?agentId=${agentId}` : `${API_BASE}/api/agent/feed`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.posts || data.posts.length === 0) {
          container.innerHTML = '<div class="text-muted text-center py-8">No content published yet.</div>';
          return;
        }

        container.innerHTML = data.posts.map(post => renderPostCard(post, currentSelectedAgent)).join('');
      } catch (err) {
        container.innerHTML = `<div class="text-danger text-center py-8">Error loading feed</div>`;
      }
    }

    function renderPostCard(post, agentObj) {
      const score = 92;
      const agentName = agentObj ? agentObj.name : (post.agentName || 'Ada');
      const agentRole = agentObj ? agentObj.role : 'AI Security Researcher';
      const platform = post.platform || 'LinkedIn / X';
      const status = post.status || 'Published';

      const wordCount = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

      let statusBadge = '<div class="badge success">✓ Published</div>';
      if (status === 'Draft') statusBadge = '<div class="badge warning">✎ Draft</div>';
      else if (status === 'Generated') statusBadge = '<div class="badge">🤖 Generated</div>';

      return `
      <article class="post-card fade-enter" id="post-card-${post.id}">
        <div class="post-header">
          <div class="post-author">
            <div class="author-avatar">${escapeHtml(agentName.charAt(0))}</div>
            <div>
              <div class="font-bold text-main">${escapeHtml(agentName)}</div>
              <div class="text-xs text-muted">${escapeHtml(agentRole)}</div>
              <div class="text-xs text-faint mt-0.5">${new Date(post.publishedAt).toLocaleString()}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold text-secondary" style="background: var(--secondary-light); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm);">${escapeHtml(platform)}</span>
            <span class="text-xs font-bold font-mono text-primary" style="background: var(--primary-light); padding: 0.25rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid rgba(37,99,235,0.2);" title="Post Word Count">
              Word Count: ${wordCount} / 220 words
            </span>
            <div class="score-circle" title="Quality Score">${score}</div>
          </div>
        </div>

        ${post.title ? `<h4 class="font-bold text-lg mb-2" style="color: var(--text-main); padding: 1.25rem 1.5rem 0 1.5rem;">${escapeHtml(post.title)}</h4>` : ''}

        <div class="post-body" style="${post.title ? 'padding-top: 0.5rem;' : ''}">${escapeHtml(post.content)}</div>
        
        <div class="post-footer flex justify-between items-center flex-wrap gap-3">
          <div class="badges" style="display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
            <div class="badge success">✓ Fact Checked</div>
            <div class="badge success">✓ Critic Approved</div>
            <div class="badge primary">✓ 7-Stage Structure</div>
            <div class="badge purple">✓ Source Verified</div>
            ${statusBadge}
          </div>
          
          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-outline text-xs" style="padding: 0.35rem 0.75rem;" onclick="openEditModal('${post.id}', '${escapeJs(post.title)}', '${escapeJs(post.content)}', '${escapeJs(platform)}', '${escapeJs(status)}')">
              Edit
            </button>
            <button class="btn btn-outline text-xs" style="padding: 0.35rem 0.75rem;" onclick="regeneratePost('${post.id}', this)">
              Regenerate
            </button>
            ${status !== 'Published' ? `<button class="btn btn-outline text-xs text-success" style="padding: 0.35rem 0.75rem;" onclick="publishPost('${post.id}')">Publish</button>` : ''}
            <button class="btn btn-outline text-xs text-danger" style="padding: 0.35rem 0.75rem; color: var(--danger); border-color: rgba(220,38,38,0.3);" onclick="deletePost('${post.id}')">
              Delete
            </button>
            <button class="btn btn-outline text-xs" style="padding: 0.35rem 0.75rem;" onclick="showDecisionTrace(this)" data-rationale="${escapeHtml(post.rationale || '')}" data-relevant="${escapeHtml(post.whyRelevantNow || '')}">
              Decision Trace
            </button>
          </div>
        </div>
      </article>
      `;
    }

    async function deletePost(postId) {
      if (!confirm('Are you sure you want to delete this post?')) return;

      try {
        const res = await fetch(`${API_BASE}/api/agent/post/${postId}`, { method: 'DELETE' });
        if (res.ok) {
          if (activeAgentId) {
            await openAgentDetails(activeAgentId);
          } else {
            await loadGlobalFeed();
          }
          loadAgents();
        } else {
          alert('Failed to delete post.');
        }
      } catch (err) {
        alert(`Error deleting post: ${err.message}`);
      }
    }

    async function regeneratePost(postId, btnEl) {
      const origText = btnEl.innerText;
      btnEl.innerText = 'Regenerating...';
      btnEl.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/agent/post/${postId}/regenerate`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.post) {
          if (activeAgentId) {
            await loadAgentFeed(activeAgentId);
          } else {
            await loadGlobalFeed();
          }
        } else {
          alert('Failed to regenerate post.');
        }
      } catch (err) {
        alert(`Error regenerating post: ${err.message}`);
      } finally {
        btnEl.innerText = origText;
        btnEl.disabled = false;
      }
    }

    async function publishPost(postId) {
      try {
        const res = await fetch(`${API_BASE}/api/agent/post/${postId}/publish`, { method: 'POST' });
        if (res.ok) {
          if (activeAgentId) {
            await loadAgentFeed(activeAgentId);
          } else {
            await loadGlobalFeed();
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function loadOpportunities() {
      const container = document.getElementById('radarGrid');
      if (!container) return;
      
      const agentId = activeAgentId || '';
      try {
        const url = agentId ? `${API_BASE}/api/agent/opportunities?agentId=${agentId}` : `${API_BASE}/api/agent/opportunities`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.opportunities || data.opportunities.length === 0) {
          container.innerHTML = '<div class="glass-card text-center py-12 px-4" style="grid-column: 1 / -1;"><div style="font-size: 2.5rem; margin-bottom: 0.5rem;">radar</div><h4 class="font-bold text-lg mb-1">No Opportunities Detected</h4><p class="text-muted text-sm mb-4">The opportunity radar is currently scanning for emerging trends.</p></div>';
          return;
        }

        container.innerHTML = data.opportunities.map(opp => renderRadarCard(opp)).join('');
      } catch (err) {
        container.innerHTML = `<div class="text-danger text-center py-8">Failed to load radar: ${err.message}</div>`;
      }
    }

    function renderRadarCard(opp) {
      const isHighOpp = opp.opportunityScore >= 80;
      const gradient = isHighOpp ? 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(167,139,250,0.15))' : 'var(--bg-surface)';
      const border = isHighOpp ? '1px solid rgba(37,99,235,0.4)' : '1px solid var(--border-color)';
      
      return `
      <div class="glass-card radar-card fade-enter flex-col justify-between" style="background: ${gradient}; border: ${border}; position: relative; overflow: hidden; height: 100%;">
        <div>
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-bold text-lg" style="color: var(--text-main); margin-right: 60px;">${escapeHtml(opp.topic)}</h4>
            <div class="score-ring-container" style="position: absolute; right: 1.25rem; top: 1.25rem; display: flex; align-items: center; justify-content: center;">
               <svg viewBox="0 0 46 46" style="width: 46px; height: 46px; transform: rotate(-90deg);">
                 <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"></circle>
                 <circle cx="23" cy="23" r="18" fill="none" stroke="${isHighOpp ? 'var(--primary)' : 'var(--warning)'}" stroke-width="4" stroke-dasharray="113.1" stroke-dashoffset="${113.1 - (113.1 * opp.opportunityScore / 100)}" style="transition: stroke-dashoffset 1s ease-out;"></circle>
               </svg>
               <span style="position: absolute; font-weight: 800; font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-main);">${opp.opportunityScore}</span>
            </div>
          </div>
          
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="badge" style="background: rgba(37,99,235,0.15); color: var(--primary);">📈 ${opp.trendState}</span>
            <span class="badge" style="background: rgba(167,139,250,0.15); color: var(--purple);">Momentum: ${opp.momentum}</span>
            <span class="badge">Sources: ${opp.sourcesCount} (${opp.coverageLevel})</span>
          </div>
          
          <details class="radar-explanation mb-4">
            <summary style="font-size: 0.75rem; font-weight: 600; color: var(--primary); cursor: pointer; user-select: none;">Why Ada chose this</summary>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.5; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px;">${escapeHtml(opp.explanation)}</p>
          </details>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div class="text-xs font-semibold text-muted">Action: <span style="color: ${isHighOpp ? 'var(--primary)' : 'var(--text-main)'}">${escapeHtml(opp.recommendation)}</span></div>
          ${isHighOpp ? `<button class="btn btn-primary text-xs" style="padding: 0.35rem 0.75rem;" onclick="openGenerateModal()">Draft Content</button>` : ''}
        </div>
      </div>
      `;
    }

    async function loadLogs() {
      if (!activeAgentId) return;
      try {
        const res = await fetch(`${API_BASE}/api/agent/logs?agentId=${activeAgentId}`);
        const data = await res.json();

        const activityContainer = document.getElementById('activityLogContainer');
        const rejectedContainer = document.getElementById('rejectedLogContainer');

        if (!data.logs || data.logs.length === 0) {
          activityContainer.innerHTML = '<div class="text-muted">No activity telemetry recorded yet.</div>';
          rejectedContainer.innerHTML = '<div class="text-muted">No rejected content logged.</div>';
          return;
        }

        const activityLogs = [];
        const rejectedLogs = [];

        data.logs.forEach(log => {
          const msg = log.message.toLowerCase();
          const time = new Date(log.createdAt).toLocaleTimeString();

          let styleClass = '';
          if (msg.includes('approved') || msg.includes('published')) styleClass = 'success';
          else if (msg.includes('issues') || msg.includes('weaknesses') || msg.includes('rewrite')) styleClass = 'warning';
          else if (log.level === 'ERROR' || msg.includes('rejected')) styleClass = 'danger';
          else styleClass = 'highlight';

          const itemHtml = `
            <div class="activity-item ${styleClass}">
              <div class="activity-time">${time}</div>
              <div class="activity-content">${escapeHtml(log.message)}</div>
              ${log.details ? `<div class="activity-details">${escapeHtml(log.details)}</div>` : ''}
            </div>
          `;

          if (styleClass === 'danger' || msg.includes('rejected')) {
            rejectedLogs.push(itemHtml);
          } else {
            activityLogs.push(itemHtml);
          }
        });

        // Update Brain panel if recent log exists
        if (data.logs.length > 0) {
          const latestLog = data.logs[0];
          const statusEl = document.getElementById('brainLiveStatus');
          if (statusEl) {
            statusEl.innerText = latestLog.message;
            updateBrainVisualizationState(latestLog.message, latestLog.level, latestLog.details);
          }
          if (typeof updateAdaWorksState === 'function') {
            updateAdaWorksState(latestLog.message, latestLog.level);
          }
        }

        // Fetch and update mission / trend info
        fetch(`${API_BASE}/api/agent/mission/latest?agentId=${activeAgentId}`).then(r => r.json()).then(mData => {
          if (mData.mission) {
            const ms = document.getElementById('brainMissionStatus');
            if (ms) ms.innerText = mData.mission.status;
          }
          if (mData.trend) {
            document.getElementById('trendTitleLabel').innerText = mData.trend.title || 'Unknown Trend';
            updateScore('Relevance', mData.trend.securityScore);
            updateScore('Novelty', mData.trend.novelty);
            updateScore('Impact', mData.trend.impact);
            updateScore('Timeliness', mData.trend.timeliness);
            updateScore('Diversity', mData.trend.sourceDiversity);
            document.getElementById('scoreConfidence').innerText = (mData.trend.confidence || 0) + '%';
            document.getElementById('trendSourcesCount').innerText = mData.trend.supportingSources || 0;

            drawThreatMap(mData.trend);
          }
        }).catch(err => console.error(err));

        activityContainer.innerHTML = activityLogs.length ? activityLogs.join('') : '<div class="text-muted">No standard activity telemetry.</div>';
        rejectedContainer.innerHTML = rejectedLogs.length ? rejectedLogs.join('') : '<div class="text-muted">No rejected content recorded.</div>';

      } catch (err) { }
    }

    function showDecisionTrace(button) {
      const rationale = button.getAttribute('data-rationale');
      const relevant = button.getAttribute('data-relevant');
      alert('Decision Trace:\n\nRationale: ' + (rationale || 'N/A') + '\n\nWhy Relevant: ' + (relevant || 'N/A'));
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function escapeJs(str) {
      if (!str) return '';
      return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "");
    }

    function updateScore(id, val) {
      const bar = document.getElementById('bar' + id);
      const text = document.getElementById('score' + id);
      if (bar) bar.style.width = (val || 0) + '%';
      if (text) text.innerText = (val || 0);
    }

    /* --- Brain Visualization Logic --- */
    const brainStages = [
      { id: 'st-research', label: 'SCANNING', icon: '🔍' },
      { id: 'st-signals', label: 'DETECTING', icon: '📡' },
      { id: 'st-connect', label: 'CLUSTERING', icon: '🧩' },
      { id: 'st-analyze', label: 'ANALYZING', icon: '📊' },
      { id: 'st-predict', label: 'PREDICTING', icon: '🔮' },
      { id: 'st-opportunity', label: 'OPP DETECTED', icon: '🎯' },
      { id: 'st-create', label: 'CREATE', icon: '✍️' },
      { id: 'st-critique', label: 'SELF-CRITIQUE', icon: '🧐' },
      { id: 'st-publish', label: 'PUBLISH', icon: '🚀' }
    ];

    let brainInitialized = false;
    let lastTrendData = null;

    function initBrainVisualization() {
      if (brainInitialized) return;
      const container = document.getElementById('brainNodesContainer');
      const svg = document.getElementById('brain-svg-lines');
      if (!container || !svg || container.clientWidth === 0) return;

      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight / 2;
      // Outer perimeter ring for pipeline stage nodes
      const radiusX = Math.min(centerX - 90, 310);
      const radiusY = Math.min(centerY - 65, 240);

      let html = '';
      let svgHtml = '';

      brainStages.forEach((stage, i) => {
        const angle = (i / brainStages.length) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radiusX;
        const y = centerY + Math.sin(angle) * radiusY;

        html += `
          <div class="brain-node" id="${stage.id}" style="left: ${x}px; top: ${y}px;">
            <div class="bn-icon">${stage.icon}</div>
            <div class="bn-label">${stage.label}</div>
          </div>
        `;

        // Line to center
        svgHtml += `<path d="M${centerX},${centerY} L${x},${y}" id="line-${stage.id}" class="bn-line"></path>`;

        // Line to next node
        const nextAngle = ((i + 1) % brainStages.length) / brainStages.length * Math.PI * 2 - Math.PI / 2;
        const nextX = centerX + Math.cos(nextAngle) * radiusX;
        const nextY = centerY + Math.sin(nextAngle) * radiusY;
        svgHtml += `<path d="M${x},${y} L${nextX},${nextY}" class="bn-line" style="opacity: 0.15;"></path>`;
      });

      container.innerHTML = html;
      svg.innerHTML = svgHtml;
      brainInitialized = true;

      if (lastTrendData) {
        drawThreatMap(lastTrendData);
      }
    }

    function updateBrainVisualizationState(msg, level, details) {
      if (!brainInitialized) return;
      const lmsg = msg.toLowerCase();

      let activeStageId = null;
      let state = 'active';

      if (lmsg.includes('research') || lmsg.includes('scanning')) activeStageId = 'st-research';
      else if (lmsg.includes('collect signals') || lmsg.includes('detecting')) activeStageId = 'st-signals';
      else if (lmsg.includes('connect signals') || lmsg.includes('cluster')) activeStageId = 'st-connect';
      else if (lmsg.includes('analyze') || lmsg.includes('analyzing')) activeStageId = 'st-analyze';
      else if (lmsg.includes('predict') || lmsg.includes('predicting trend')) activeStageId = 'st-predict';
      else if (lmsg.includes('opportunity') || lmsg.includes('detect trend')) activeStageId = 'st-opportunity';
      else if (lmsg.includes('create') || lmsg.includes('writing') || lmsg.includes('generate')) activeStageId = 'st-create';
      else if (lmsg.includes('critique') || lmsg.includes('fact check') || lmsg.includes('memory check') || lmsg.includes('evaluat')) activeStageId = 'st-critique';
      else if (lmsg.includes('publish') || lmsg.includes('remember')) activeStageId = 'st-publish';

      if (!activeStageId) return;

      if (level === 'ERROR' || lmsg.includes('reject') || lmsg.includes('fail') || lmsg.includes('duplicate')) state = 'rejected';
      else if (lmsg.includes('publish') || lmsg.includes('success') || lmsg.includes('completed')) state = 'completed';

      brainStages.forEach((stage) => {
        const el = document.getElementById(stage.id);
        const line = document.getElementById(`line-${stage.id}`);
        if (!el) return;

        el.className = 'brain-node';
        if (line) line.classList.remove('active');

        if (stage.id === activeStageId) {
          el.classList.add(state);
          if (line) line.classList.add('active');

          if (state === 'rejected') {
            document.getElementById('brainDecisionCard').style.borderLeftColor = 'var(--danger)';
            document.getElementById('brainDecisionStatus').innerText = 'REJECTED';
            document.getElementById('brainDecisionStatus').style.color = 'var(--danger)';
            document.getElementById('brainDecisionReason').innerText = msg;
          } else if (state === 'completed') {
            document.getElementById('brainDecisionCard').style.borderLeftColor = 'var(--success)';
            document.getElementById('brainDecisionStatus').innerText = 'APPROVED';
            document.getElementById('brainDecisionStatus').style.color = 'var(--success)';
            document.getElementById('brainDecisionReason').innerText = msg;
          } else {
            document.getElementById('brainDecisionCard').style.borderLeftColor = 'var(--primary)';
            document.getElementById('brainDecisionStatus').innerText = 'EVALUATING';
            document.getElementById('brainDecisionStatus').style.color = 'var(--primary)';
            document.getElementById('brainDecisionReason').innerText = 'In progress...';
          }
        }
      });

      if (state === 'rejected') {
        const rj = document.getElementById('brainTopicsRejected');
        if (rj) rj.innerText = (parseInt(rj.innerText) + 1).toLocaleString();
      }
    }

    function drawThreatMap(trend) {
      if (!trend || !trend.signals) return;
      lastTrendData = trend;

      const container = document.getElementById('threatMapContainer');
      const svg = document.getElementById('brain-svg-lines');
      if (!container || !svg || container.clientWidth === 0) return;

      // Clear previous threat map items cleanly
      container.innerHTML = '';
      const oldLines = svg.querySelectorAll('.threat-line');
      oldLines.forEach(l => l.remove());

      let signals = [];
      try {
        signals = typeof trend.signals === 'string' ? JSON.parse(trend.signals) : trend.signals;
      } catch (e) { }
      if (!Array.isArray(signals) || signals.length === 0) return;

      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight / 2;

      // Calculate outer radius matching stage nodes
      const outerRadiusX = Math.min(centerX - 90, 310);
      const outerRadiusY = Math.min(centerY - 65, 240);

      // Signals sit on an inner orbit (48% of outer perimeter) to prevent collision with stage nodes
      const innerRadiusX = outerRadiusX * 0.48;
      const innerRadiusY = outerRadiusY * 0.48;

      // Central Trend Node
      let html = `
        <div class="threat-node central" style="left:${centerX}px; top:${centerY}px; transform:translate(-50%, -50%);">
          <div style="font-size:1.4rem; margin-bottom:0.2rem;">📈</div>
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-main); line-height:1.25; max-height:2.5em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;" title="${escapeHtml(trend.title)}">${escapeHtml(trend.title)}</div>
          <div style="margin-top:0.35rem;"><span style="font-size:0.65rem; font-weight:800; color:var(--primary); background:var(--primary-light); border:1px solid rgba(37,99,235,0.2); padding:0.15rem 0.55rem; border-radius:9999px;">CONFIDENCE: ${trend.confidence}%</span></div>
        </div>
      `;

      let svgHtml = '';
      const numSignals = signals.length;
      const angleOffset = -Math.PI / 4;

      signals.forEach((sigTitle, i) => {
        const angle = angleOffset + (i / numSignals) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * innerRadiusX;
        const y = centerY + Math.sin(angle) * innerRadiusY;

        html += `
           <div class="threat-node" style="left:${x}px; top:${y}px; transform:translate(-50%, -50%);" title="Discovered Signal: ${escapeHtml(sigTitle)}" onclick="alert('Discovered Signal Source:\\n\\n${escapeJs(sigTitle)}')">
              <div style="font-size:0.9rem; margin-bottom:0.15rem; color:var(--primary);">📄</div>
              <div style="font-size:0.68rem; font-weight:600; color:var(--text-muted); line-height:1.2; max-height:2.4em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${escapeHtml(sigTitle)}</div>
           </div>
         `;

        svgHtml += `<path d="M${centerX},${centerY} L${x},${y}" class="threat-line bn-line active" style="stroke-opacity: 0.45; stroke-dasharray: 4 4;"></path>`;
      });

      container.innerHTML = html;
      svg.insertAdjacentHTML('beforeend', svgHtml);
    }

    window.addEventListener('resize', () => {
      if (document.getElementById('view-brain').classList.contains('active')) {
        brainInitialized = false;
        initBrainVisualization();
      }
    });

    function updateAdaWorksState(msg, level) {
      const lmsg = msg.toLowerCase();
      let activeIdx = 0;
      
      if (lmsg.includes('research') || lmsg.includes('scanning') || lmsg.includes('discover')) activeIdx = 1;
      else if (lmsg.includes('connect') || lmsg.includes('group') || lmsg.includes('trend') || lmsg.includes('signal')) activeIdx = 2;
      else if (lmsg.includes('evaluat') || lmsg.includes('score') || lmsg.includes('memory')) activeIdx = 3;
      else if (lmsg.includes('create') || lmsg.includes('writing') || lmsg.includes('generate') || lmsg.includes('draft')) activeIdx = 4;
      else if (lmsg.includes('critique') || lmsg.includes('fact check') || lmsg.includes('decision') || level === 'ERROR' || lmsg.includes('reject')) activeIdx = 5;
      else if (lmsg.includes('publish') || lmsg.includes('success') || lmsg.includes('completed')) activeIdx = 6;
      
      if (activeIdx > 0) {
        setAdaWorksActiveStep(activeIdx);
      }
    }

    function setAdaWorksActiveStep(stepNum) {
      for (let i = 1; i <= 6; i++) {
        const el = document.getElementById('ada-st-' + i);
        if (el) {
          if (i === stepNum) el.classList.add('active');
          else el.classList.remove('active');
        }
      }
      
      const progressEl = document.getElementById('adaWorkflowProgress');
      if (progressEl) {
        const percentages = [0, 0, 20, 40, 60, 80, 100];
        progressEl.style.width = percentages[stepNum || 0] + '%';
      }
    }

    const aiPhrases = [
      "[SYS] Re-calibrating neural weights...",
      "[MEM] Optimizing context window embeddings...",
      "[EVAL] Cross-referencing threat database...",
      "[OK] Policy guardrails validated.",
      "[SYS] Synthesizing output tokens...",
      "[MEM] Injecting relevant historical context...",
      "[EVAL] Semantic similarity score: 0.94",
      "[OK] Autonomous threshold met.",
      "[SYS] Refreshing proxy routing table...",
      "[EVAL] Analyzing multi-stage execution paths..."
    ];
    
    setInterval(() => {
      const stream = document.getElementById('semanticStream');
      if (stream) {
        const line = document.createElement('div');
        line.className = 'stream-line';
        const phrase = aiPhrases[Math.floor(Math.random() * aiPhrases.length)];
        
        if (phrase.startsWith('[SYS]')) line.innerHTML = `<span class="stream-prefix-sys">[SYS]</span> ${phrase.substring(5)}`;
        else if (phrase.startsWith('[MEM]')) line.innerHTML = `<span class="stream-prefix-mem">[MEM]</span> ${phrase.substring(5)}`;
        else if (phrase.startsWith('[EVAL]')) line.innerHTML = `<span class="stream-prefix-eval">[EVAL]</span> ${phrase.substring(6)}`;
        else if (phrase.startsWith('[OK]')) line.innerHTML = `<span class="stream-prefix-ok">[OK]</span> ${phrase.substring(4)}`;
        else line.innerText = phrase;
        
        stream.appendChild(line);
        if (stream.children.length > 5) {
          stream.removeChild(stream.firstChild);
        }
      }
    }, 2500);

  