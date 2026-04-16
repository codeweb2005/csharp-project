/* ============================================================
   main.js — Shared JS for Vinh Khanh Food Tour Docs
   ============================================================ */

/* 1. Highlight active nav link */
(function () {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav .nav-links a').forEach(a => {
        if ((a.getAttribute('href') || '') === page) a.classList.add('active');
    });
})();

/* 2. Mobile nav toggle */
(function () {
    const btn   = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!btn || !links) return;
    btn.addEventListener('click', () => links.classList.toggle('open'));
    document.addEventListener('click', e => {
        if (!e.target.closest('nav')) links.classList.remove('open');
    });
})();

/* 3. Mermaid init — dark theme matching navy palette */
(function () {
    if (typeof mermaid === 'undefined') return;
    mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {
            /* Background */
            background:          '#1e293b',
            mainBkg:             '#1e293b',
            nodeBkg:             '#1e293b',
            /* Borders & lines */
            border1:             '#475569',
            border2:             '#334155',
            lineColor:           '#64748b',
            /* Text */
            primaryTextColor:    '#f1f5f9',
            secondaryTextColor:  '#94a3b8',
            tertiaryTextColor:   '#94a3b8',
            /* Nodes */
            primaryColor:        '#1e3a5f',
            primaryBorderColor:  '#0ea5e9',
            secondaryColor:      '#0f4c3a',
            secondaryBorderColor:'#14b8a6',
            tertiaryColor:       '#2d1b69',
            tertiaryBorderColor: '#6366f1',
            /* Clusters */
            clusterBkg:          '#0f172a',
            clusterBorder:       '#334155',
            /* Special */
            edgeLabelBackground: '#0f172a',
            actorBkg:            '#1e293b',
            actorBorder:         '#0ea5e9',
            actorTextColor:      '#f1f5f9',
            actorLineColor:      '#475569',
            signalColor:         '#94a3b8',
            signalTextColor:     '#f1f5f9',
            labelBoxBkgColor:    '#1e293b',
            labelBoxBorderColor: '#334155',
            labelTextColor:      '#f1f5f9',
            loopTextColor:       '#94a3b8',
            noteBkgColor:        '#1a2744',
            noteTextColor:       '#94a3b8',
            noteBorderColor:     '#334155',
            /* Sequence numbers */
            sequenceNumberColor: '#0ea5e9',
            /* ER / class */
            fillType0:           '#1e3a5f',
            fillType1:           '#0f4c3a',
            fillType2:           '#2d1b69',
            fillType3:           '#4a1c40',
            fillType4:           '#3d2800',
        },
        flowchart: { curve: 'basis', padding: 20, htmlLabels: true },
        sequence:  { actorMargin: 60, messageMargin: 20, mirrorActors: false, showSequenceNumbers: false },
        er:        { useMaxWidth: true },
        fontSize:  13
    });
})();

/* 4. Diagram Modal */
const DiagramModal = (function () {
    let overlay, titleEl, body, vp, zpctEl;
    let scale = 1, panX = 0, panY = 0;
    let dragging = false, startX, startY, ox, oy;

    function applyTransform () {
        if (vp) vp.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
        if (zpctEl) zpctEl.textContent = Math.round(scale * 100) + '%';
    }

    function zoom (factor) {
        scale = Math.min(Math.max(scale * factor, 0.15), 6);
        applyTransform();
    }

    function fit () { scale = 1; panX = 0; panY = 0; applyTransform(); }

    async function open (mermaidCode, titleText) {
        if (!overlay) return;
        overlay.classList.add('active');
        if (titleEl) titleEl.textContent = titleText || 'Sơ đồ';
        if (vp) vp.innerHTML = '<p class="loading-msg">⏳ Đang render…</p>';
        fit();
        try {
            const id  = 'dg_' + Date.now();
            const result = await mermaid.render(id, mermaidCode);
            const svg = typeof result === 'object' ? result.svg : result;
            if (vp) vp.innerHTML = svg;
        } catch (err) {
            if (vp) vp.innerHTML = `<p style="color:#ef4444;padding:2rem;font-size:.85rem">⚠️ Lỗi render sơ đồ:<br>${err.message}</p>`;
        }
    }

    function close () { if (overlay) overlay.classList.remove('active'); }

    document.addEventListener('DOMContentLoaded', function () {
        overlay = document.getElementById('dgOverlay');
        if (!overlay) return;
        titleEl = document.getElementById('dgTitle');
        body    = document.getElementById('dgBody');
        vp      = document.getElementById('dgVp');
        zpctEl  = document.getElementById('zpct');

        document.getElementById('dgClose')  ?.addEventListener('click', close);
        document.getElementById('zoomIn')   ?.addEventListener('click', () => zoom(1.25));
        document.getElementById('zoomOut')  ?.addEventListener('click', () => zoom(0.8));
        document.getElementById('zoomReset')?.addEventListener('click', fit);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

        /* Pan */
        body?.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            dragging = true; startX = e.clientX; startY = e.clientY; ox = panX; oy = panY;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            panX = ox + (e.clientX - startX); panY = oy + (e.clientY - startY);
            applyTransform();
        });
        document.addEventListener('mouseup', () => dragging = false);

        /* Wheel zoom */
        body?.addEventListener('wheel', e => {
            e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9);
        }, { passive: false });
    });

    return { open };
})();

/* 5. Bind diagram buttons */
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-diagram]').forEach(btn => {
        btn.addEventListener('click', function () {
            const key  = this.dataset.diagram;
            const data = window.DIAGRAM_DATA;
            if (!data?.diagrams?.[key]) {
                alert(`Sơ đồ "${key}" chưa được định nghĩa.`);
                return;
            }
            const d = data.diagrams[key];
            DiagramModal.open(d.mermaid, d.title);
        });
    });
});

/* 6. Scroll-reveal */
(function () {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.style.opacity  = '1';
                e.target.style.transform = 'translateY(0)';
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.08 });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.card, .stat-card, .tier-item, .timeline-item').forEach(el => {
            el.style.opacity  = '0';
            el.style.transform = 'translateY(16px)';
            el.style.transition = 'opacity .4s ease, transform .4s ease';
            observer.observe(el);
        });
    });
})();

/* 7. Reading progress bar */
(function () {
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const pct = (document.documentElement.scrollTop /
            (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        bar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
})();
