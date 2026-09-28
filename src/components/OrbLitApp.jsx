"use client";

import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import {
  Search,
  RefreshCw,
  X,
  Loader2,
  BookOpen,
  ExternalLink,
  Library,
  Check,
  Plus,
  Map as MapIcon,
  FolderOpen,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Tag,
  List,
  Sparkles,
} from "lucide-react";
import {
  API,
  PLOT,
  MAP_HEIGHT_MIN,
  MAP_HEIGHT_MAX,
  MAX_DISCOVERY_NODES,
  MAX_CITING_PER_PAPER,
  defaultMapHeight,
  splitName,
  reconstructAbstract,
  shortId,
  normalizeDoi,
  nodeRadius,
  nodePaint,
  fetchWorksByOpenAlexIds,
  mapPool,
  workToNode,
  edgeEndpoints,
  fetchWorksByDois,
  logAxisTicks,
  isUsableTitle,
  dedupeNodesByTitle,
} from "@/lib/citation-graph";
import { inputStyle, btnStyle, iconBtnStyle } from "@/lib/ui-styles";
import { useTags } from "@/hooks/useTags";
import { useProject } from "@/hooks/useProject";
import TagsPanel from "@/components/TagsPanel";
import ProjectsPanel from "@/components/ProjectsPanel";
import NewMapCard from "@/components/NewMapCard";
import FiltersPanel from "@/components/FiltersPanel";
import ClusterMap from "@/components/ClusterMap";

export default function App() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const [savedMsg, setSavedMsg] = useState("");
  const [mapMode, setMapMode] = useState("explore"); // "explore" | "collection"
  const [viewMode, setViewMode] = useState("map"); // "map" | "list" | "clusters"
  // Last generated Themes-view result ({ points, excluded, clusterCount })
  // for this map — persisted with the project so it survives reload /
  // logout-login instead of needing to be regenerated (and re-billed via
  // OpenAI) every time.
  const [clusterResult, setClusterResult] = useState(null);
  const [listScope, setListScope] = useState("all"); // "all" | "collection" | "discovery"
  const [listTagFilter, setListTagFilter] = useState("all"); // "all" | "none" | tagId
  const [listSort, setListSort] = useState("year-desc");
  const [listQuery, setListQuery] = useState("");
  const [showLinks, setShowLinks] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [mapHeight, setMapHeight] = useState(defaultMapHeight);
  const [highlightId, setHighlightId] = useState(null);
  const [viewTransform, setViewTransform] = useState(() => d3.zoomIdentity);
  const [abstractLoading, setAbstractLoading] = useState(false);
  const {
    tags,
    setTags,
    paperTags,
    setPaperTags,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    tagError,
    createTag,
    deleteTag,
    assignTag,
  } = useTags();
  const [showTagsPanel, setShowTagsPanel] = useState(false);

  // Map filters — null means "unfiltered" (full range). Thin out a busy
  // map by citation count, publication year, or network-link count
  // (degree) without changing the underlying data.
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [citRange, setCitRange] = useState(null);
  const [yearRange, setYearRange] = useState(null);
  const [linksRange, setLinksRange] = useState(null);
  function resetFilters() {
    setCitRange(null);
    setYearRange(null);
    setLinksRange(null);
  }
  const {
    status: projectStatus,
    saveStatus,
    listProjects,
    getProjectData,
    createProject,
    deleteProject: deleteProjectRow,
    renameProject: renameProjectRow,
    setActiveProjectId,
    scheduleSave,
    flushSave,
  } = useProject();
  const autosave = () => scheduleSave(buildProjectPayload);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectIdState] = useState(null);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [switchingProjectId, setSwitchingProjectId] = useState(null);
  const [showStartCard, setShowStartCard] = useState(false);
  const draftPreviousProjectIdRef = useRef(null);
  // Mirrors `activeProjectId` synchronously. React state updates inside an
  // async function don't land in that function's own closure — a later
  // `await` in the same call doesn't see a fresher `activeProjectId`, only
  // the next render does. Anything that needs the *current* active id
  // mid-function (like ensureDraftProjectCreated's re-entrancy guard) reads
  // this ref instead, updated via setActiveProject() below.
  const activeProjectIdRef = useRef(null);
  function setActiveProject(id) {
    activeProjectIdRef.current = id;
    setActiveProjectIdState(id);
    setActiveProjectId(id);
  }

  // Zotero state — credentials pre-filled from .env if present
  const [showZoteroPanel, setShowZoteroPanel] = useState(false);
  const [zoteroUserId, setZoteroUserId] = useState("");
  const [zoteroApiKey, setZoteroApiKey] = useState("");
  const [zoteroCollections, setZoteroCollections] = useState([]);
  const [selectedCollectionKey, setSelectedCollectionKey] = useState(""); // "" = main library
  const [zoteroConnected, setZoteroConnected] = useState(false);
  const [zoteroBusy, setZoteroBusy] = useState(false);
  const [zoteroMsg, setZoteroMsg] = useState("");
  const zoteroDoisRef = useRef(new Set());
  // Papers hidden from the network map (and their edges) via the sidebar
  // toggle — a purely visual declutter, the node/link data itself stays
  // intact so it can be shown again. Persisted with the project.
  const hiddenNodeIdsRef = useRef(new Set());
  const [addingId, setAddingId] = useState(null);

  const svgRef = useRef(null);
  const dimsRef = useRef({ w: 900, h: defaultMapHeight() });
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const axisRef = useRef(null);
  const simRef = useRef(null);
  const dragNode = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const logScaleRef = useRef(false);
  const resizingRef = useRef(null);

  function applyPaperTagsToNodes() {
    nodesRef.current.forEach((n) => {
      n.tagId = paperTags[n.id] || null;
    });
    setTick((t) => t + 1);
  }

  useEffect(() => {
    applyPaperTagsToNodes();
    if (selected) {
      const n = nodesRef.current.find((x) => x.id === selected.id);
      if (n) setSelected({ ...n });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperTags]);

  // createTag/deleteTag live in useTags(); assignTagToSelected stays here
  // since it also updates the D3 node ref + re-selects the open sidebar item.
  function assignTagToSelected(tagId) {
    if (!selected) return;
    const id = selected.id;
    assignTag(id, tagId);
    const node = nodesRef.current.find((n) => n.id === id);
    if (node) {
      node.tagId = tagId || null;
      setSelected({ ...node });
    }
    setTick((t) => t + 1);
  }

  function getFilteredListNodes() {
    let nodes = nodesRef.current.slice();
    if (listScope === "collection") {
      nodes = nodes.filter((n) => n.kind === "collection");
    } else if (listScope === "discovery") {
      nodes = nodes.filter((n) => n.kind === "discovery");
    }
    if (listTagFilter === "none") {
      nodes = nodes.filter((n) => !n.tagId);
    } else if (listTagFilter !== "all") {
      nodes = nodes.filter((n) => n.tagId === listTagFilter);
    }
    const q = listQuery.trim().toLowerCase();
    if (q) {
      nodes = nodes.filter(
        (n) =>
          (n.label || "").toLowerCase().includes(q) ||
          (n.doi || "").includes(q) ||
          String(n.year || "").includes(q)
      );
    }
    const mul = listSort.endsWith("-asc") ? 1 : -1;
    const key = listSort.replace(/-asc|-desc$/, "");
    nodes.sort((a, b) => {
      if (key === "title") return mul * (a.label || "").localeCompare(b.label || "");
      if (key === "citations") return mul * ((a.cited_by_count || 0) - (b.cited_by_count || 0));
      if (key === "links") return mul * ((a.internalDegree || 0) - (b.internalDegree || 0));
      // year
      return mul * ((a.year || 0) - (b.year || 0));
    });
    return nodes;
  }

  function showNodeOnMap(n) {
    setViewMode("map");
    setHighlightId(n.id);
    selectNode(n);
    requestAnimationFrame(() => {
      setTimeout(() => panToNode(n), 50);
    });
  }

  useEffect(() => {
    const sim = d3
      .forceSimulation(nodesRef.current)
      .force("link", d3.forceLink(linksRef.current).id((d) => d.id).distance(85).strength(0.35))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(dimsRef.current.w / 2, dimsRef.current.h / 2))
      .force("collide", d3.forceCollide((d) => nodeRadius(d) + 10))
      .alphaDecay(0.02)
      .on("tick", () => setTick((t) => t + 1));
    simRef.current = sim;

    restoreZoteroConnection();
    return () => sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the user's saved maps once useProject reports the session is
  // ready: list them and load the most recently updated one into the
  // canvas. A brand-new account has zero maps — the list stays empty (no
  // auto-created "Untitled Map" placeholder); the start card opens instead
  // so there's still an obvious way to build the first one.
  useEffect(() => {
    if (projectStatus !== "ready") return;
    (async () => {
      const list = await listProjects();
      setProjects(list);
      if (list.length === 0) {
        setShowStartCard(true);
        return;
      }
      const first = list[0];
      setActiveProject(first.id);
      const data = await getProjectData(first.id);
      if (data) {
        try {
          applyProjectData(data);
        } catch (e) {
          console.warn("Failed to restore saved project:", e);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectStatus]);

  /** Clears the canvas back to a blank map — used before loading a
   *  different saved map, and when creating a brand-new one. */
  function resetMapState() {
    if (simRef.current) simRef.current.stop();
    nodesRef.current = [];
    linksRef.current = [];
    axisRef.current = null;
    zoteroDoisRef.current = new Set();
    hiddenNodeIdsRef.current = new Set();
    setTags([]);
    setPaperTags({});
    setMapMode("explore");
    setViewMode("map");
    setSelected(null);
    setHighlightId(null);
    setSearchResults([]);
    setQuery("");
    setError(null);
    setShowStartCard(false);
    setClusterResult(null);
    resetFilters();
    restart(1);
    requestAnimationFrame(() => resetZoom());
    setTick((t) => t + 1);
  }

  /** Toggles whether a paper (and any link touching it) is drawn on the
   *  network map — a pure declutter action, the underlying node/link data
   *  is untouched so toggling back shows it exactly as before. */
  function toggleNodeHidden(id) {
    if (hiddenNodeIdsRef.current.has(id)) {
      hiddenNodeIdsRef.current.delete(id);
    } else {
      hiddenNodeIdsRef.current.add(id);
    }
    setTick((t) => t + 1);
    autosave();
  }

  async function switchToProject(id) {
    if (id === activeProjectIdRef.current || switchingProjectId) return;
    setShowProjectsPanel(false);
    setSwitchingProjectId(id);
    await flushSave(buildProjectPayload); // commit any pending edit to the outgoing map first
    resetMapState();
    setActiveProject(id);
    const data = await getProjectData(id);
    if (data) {
      try {
        applyProjectData(data);
      } catch (e) {
        console.warn("Failed to load map:", e);
        setError("Could not load that map.");
      }
    }
    setSwitchingProjectId(null);
  }

  /** "New map" only opens a blank draft — nothing is saved to the maps
   *  list yet (no project row created). The row only gets created once
   *  the user actually builds something on the start card (Create Map /
   *  picking a single paper), via ensureDraftProjectCreated(). Dismissing
   *  the card without building anything reverts to whichever map was
   *  active before, so no empty "Untitled Map" entries pile up. */
  async function handleCreateProject() {
    setShowProjectsPanel(false);
    await flushSave(buildProjectPayload);
    draftPreviousProjectIdRef.current = activeProjectIdRef.current;
    resetMapState();
    setActiveProject(null);
    setShowStartCard(true);
  }

  /** Lazily creates (and activates) the project row for the map currently
   *  being drafted — a no-op if a project is already active (e.g.
   *  Synchronize rebuilding an existing collection map, or a second call
   *  in the same flow that already created one). Reads the ref, not the
   *  `activeProjectId` state, since this can run mid-async-function where
   *  the state from an earlier setActiveProject() in the same call hasn't
   *  landed yet. */
  async function ensureDraftProjectCreated(name) {
    if (activeProjectIdRef.current) return activeProjectIdRef.current;
    const created = await createProject(name || "Untitled Map");
    setProjects((prev) => [created, ...prev]);
    setActiveProject(created.id);
    return created.id;
  }

  async function dismissStartCard() {
    setShowStartCard(false);
    if (!activeProjectIdRef.current && draftPreviousProjectIdRef.current) {
      await switchToProject(draftPreviousProjectIdRef.current);
    }
  }

  async function handleDeleteProject(id) {
    const wasActive = id === activeProjectIdRef.current;
    await deleteProjectRow(id);
    const remaining = projects.filter((p) => p.id !== id);

    if (!wasActive) {
      setProjects(remaining);
      return;
    }

    if (remaining.length > 0) {
      setProjects(remaining);
      resetMapState();
      const next = remaining[0];
      setActiveProject(next.id);
      const data = await getProjectData(next.id);
      if (data) {
        try {
          applyProjectData(data);
        } catch (e) {
          console.warn("Failed to load map:", e);
        }
      }
    } else {
      const created = await createProject();
      setProjects([created]);
      resetMapState();
      setActiveProject(created.id);
    }
  }

  async function handleRenameProject(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    await renameProjectRow(id, trimmed);
  }

  // Debounced autosave for state that's already reactive (tags, view
  // options, selection). Graph-mutating actions (loadSeed, expandNode,
  // createCollectionMap, ...) call autosave() directly themselves, since
  // nodesRef/linksRef mutations don't otherwise trigger this effect.
  useEffect(() => {
    if (projectStatus !== "ready") return;
    autosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectStatus,
    tags,
    paperTags,
    mapMode,
    viewMode,
    listScope,
    listTagFilter,
    listSort,
    listQuery,
    showLinks,
    showLabels,
    showDiscovery,
    logScale,
    mapHeight,
    highlightId,
    selected?.id,
    selectedCollectionKey,
  ]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .filter((event) => {
        // Allow wheel zoom always; pan with left-drag on background (not on nodes)
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" || event.type === "pointerdown") {
          return event.target === svgRef.current || event.target.closest?.(".plot-bg");
        }
        return !event.ctrlKey;
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        setViewTransform(event.transform);
      });
    configureZoomExtents(zoom);
    svg.call(zoom);
    // Prevent browser page scroll/zoom stealing trackpad gestures on the map
    svg.on("wheel.zoom-block", (event) => event.preventDefault());
    zoomBehaviorRef.current = zoom;
    return () => {
      svg.on(".zoom", null);
      svg.on("wheel.zoom-block", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function viewportExtent() {
    const w = dimsRef.current.w || 900;
    const h = dimsRef.current.h || mapHeight;
    return [
      [0, 0],
      [w, h],
    ];
  }

  function configureZoomExtents(zoom = zoomBehaviorRef.current) {
    if (!zoom) return;
    const ext = viewportExtent();
    zoom.extent(ext).translateExtent(ext).scaleExtent([1, 8]);
  }

  function clampZoomTransform(t) {
    const zoom = zoomBehaviorRef.current;
    if (!zoom || !t) return t || d3.zoomIdentity;
    const ext = viewportExtent();
    return zoom.constrain()(t, ext, ext);
  }

  function applyZoomTransform(t, { animate = false, duration = 250 } = {}) {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    configureZoomExtents();
    const next = clampZoomTransform(t);
    const sel = d3.select(svgRef.current);
    if (animate) {
      sel.transition().duration(duration).call(zoomBehaviorRef.current.transform, next);
    } else {
      sel.call(zoomBehaviorRef.current.transform, next);
    }
  }

  useEffect(() => {
    function measure() {
      if (!svgRef.current) return;
      const w = svgRef.current.clientWidth || 900;
      dimsRef.current.w = w;
      dimsRef.current.h = mapHeight;
      configureZoomExtents();
      // Keep current view clamped to the new viewport — no empty margins
      applyZoomTransform(transformRef.current);
      if (mapMode === "collection" && nodesRef.current.length) {
        layoutCollectionMap();
        setTick((t) => t + 1);
      } else if (simRef.current) {
        simRef.current.force("center", d3.forceCenter(w / 2, mapHeight / 2));
        if (nodesRef.current.length) restart(0.4);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, logScale, mapHeight]);

  function onMapHeightResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { startY: e.clientY, startH: mapHeight };
    const onMove = (ev) => {
      if (!resizingRef.current) return;
      const delta = ev.clientY - resizingRef.current.startY;
      const next = Math.round(
        Math.min(MAP_HEIGHT_MAX, Math.max(MAP_HEIGHT_MIN, resizingRef.current.startH + delta))
      );
      setMapHeight(next);
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function fillViewportHeight() {
    setMapHeight(Math.round(defaultMapHeight()));
  }

  function panToNode(n) {
    if (!n || !svgRef.current || !zoomBehaviorRef.current || n.x == null || n.y == null) return;
    const w = dimsRef.current.w;
    const h = dimsRef.current.h;
    const k = Math.max(transformRef.current.k, 1.25);
    const t = d3.zoomIdentity.translate(w / 2 - n.x * k, h / 2 - n.y * k).scale(k);
    applyZoomTransform(t, { animate: true, duration: 400 });
  }

  async function focusSearchResult(work) {
    const id = shortId(work.id);
    const doi = normalizeDoi(work.doi);
    setSearchResults([]);
    setQuery("");
    setError(null);

    let node = nodesRef.current.find((n) => n.id === id);
    if (!node && doi) {
      node = nodesRef.current.find((n) => n.doi && n.doi === doi);
    }

    if (!node) {
      setHighlightId(null);
      setSavedMsg("Paper is not on the current map.");
      setTimeout(() => setSavedMsg(""), 4000);
      return;
    }

    setHighlightId(node.id);
    await selectNode(node);
    panToNode(node);
    setSavedMsg("Highlighted on map.");
    setTimeout(() => setSavedMsg(""), 3000);
  }

  function restart(alpha = 0.9) {
    const sim = simRef.current;
    if (!sim) return;
    sim.nodes(nodesRef.current);
    sim.force("link").links(linksRef.current);
    sim.alpha(alpha).restart();
  }

  function layoutCollectionMap() {
    const nodes = nodesRef.current;
    if (!nodes.length) {
      axisRef.current = null;
      return;
    }
    const w = dimsRef.current.w;
    const h = dimsRef.current.h;
    const years = nodes.map((n) => n.year).filter((y) => y != null);
    const cites = nodes.map((n) => n.cited_by_count || 0);
    const minYear = (years.length ? d3.min(years) : 2000) - 1;
    const maxYear = (years.length ? d3.max(years) : new Date().getFullYear()) + 1;
    const maxCite = Math.max(d3.max(cites) || 0, 1);
    const useLog = logScaleRef.current;

    const xScale = d3
      .scaleLinear()
      .domain([minYear, maxYear])
      .range([PLOT.left, w - PLOT.right]);
    const yScale = useLog
      ? d3
          .scaleLog()
          .domain([1, Math.max(maxCite * 1.08, 2)])
          .range([h - PLOT.bottom, PLOT.top])
          .clamp(true)
      : d3
          .scaleLinear()
          .domain([0, maxCite * 1.08])
          .range([h - PLOT.bottom, PLOT.top]);

    // Slight vertical jitter for identical year/cite pairs so nodes don't fully overlap
    const seen = new Map();
    nodes.forEach((n) => {
      const year = n.year ?? minYear;
      const citeVal = useLog ? Math.max(1, n.cited_by_count || 0) : n.cited_by_count || 0;
      const key = `${year}|${n.cited_by_count || 0}`;
      const dup = seen.get(key) || 0;
      seen.set(key, dup + 1);
      n.x = xScale(year) + (dup % 2 === 0 ? -1 : 1) * Math.floor(dup / 2) * 4;
      n.y = yScale(citeVal) - Math.floor(dup / 2) * 3;
      n.fx = n.x;
      n.fy = n.y;
    });

    const yTicks = useLog
      ? logAxisTicks(yScale)
      : yScale.ticks(6).map((v) => ({ value: Math.round(v), y: yScale(v) }));

    axisRef.current = {
      xTicks: xScale.ticks(8).map((v) => ({ value: v, x: xScale(v) })),
      yTicks,
      xLabel: "Publication year",
      yLabel: useLog ? "Citations (log)" : "Citations",
      w,
      h,
    };
  }

  function resetZoom() {
    applyZoomTransform(d3.zoomIdentity, { animate: true, duration: 250 });
  }

  function zoomBy(factor) {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    configureZoomExtents();
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, factor);
  }

  function fitView() {
    const nodes = nodesRef.current;
    if (!nodes.length || !svgRef.current || !zoomBehaviorRef.current) {
      resetZoom();
      return;
    }
    const w = dimsRef.current.w;
    const h = dimsRef.current.h;
    const pad = 40;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = d3.min(xs) - pad;
    const maxX = d3.max(xs) + pad;
    const minY = d3.min(ys) - pad;
    const maxY = d3.max(ys) + pad;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    // Never zoom out below 1× — keeps the viewport filled (no empty margins)
    const scale = Math.min(8, Math.max(1, 0.9 * Math.min(w / bw, h / bh)));
    const tx = w / 2 - (scale * (minX + maxX)) / 2;
    const ty = h / 2 - (scale * (minY + maxY)) / 2;
    applyZoomTransform(d3.zoomIdentity.translate(tx, ty).scale(scale), { animate: true, duration: 300 });
  }

  function toggleLogScale() {
    const next = !logScaleRef.current;
    logScaleRef.current = next;
    setLogScale(next);
    if (mapMode === "collection") {
      layoutCollectionMap();
      setTick((t) => t + 1);
    }
  }

  async function selectNode(n) {
    setSelected(n);
    if (n.abstract != null && n.abstract !== undefined) return;
    setAbstractLoading(true);
    try {
      const w = await (await fetch(`${API}/${n.id}`)).json();
      const abstract = reconstructAbstract(w.abstract_inverted_index) || "";
      n.abstract = abstract;
      n.abstract_inverted_index = w.abstract_inverted_index;
      if (!n.authorships?.length) n.authorships = w.authorships || [];
      if (!n.doi) n.doi = normalizeDoi(w.doi);
      if (!n.primary_location) n.primary_location = w.primary_location || null;
      setSelected({ ...n });
      setTick((t) => t + 1);
    } catch (e) {
      n.abstract = "";
      setSelected({ ...n });
    } finally {
      setAbstractLoading(false);
    }
  }

  async function doSearch(q) {
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`${API}?search=${encodeURIComponent(q)}&per_page=8`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  /** Returns the existing node for this work, or a newly created one. */
  function addNode(work, kind) {
    const id = shortId(work.id);
    let n = nodesRef.current.find((x) => x.id === id);
    if (!n) {
      n = {
        id,
        label: work.display_name || "Untitled",
        year: work.publication_year,
        cited_by_count: work.cited_by_count || 0,
        referenced_works: work.referenced_works || [],
        cited_by_api_url: work.cited_by_api_url,
        doi: normalizeDoi(work.doi),
        authorships: work.authorships || [],
        primary_location: work.primary_location || null,
        abstract: work.abstract_inverted_index
          ? reconstructAbstract(work.abstract_inverted_index)
          : undefined,
        kind,
        tagId: paperTags[id] || null,
        x: dimsRef.current.w / 2 + (Math.random() - 0.5) * 40,
        y: dimsRef.current.h / 2 + (Math.random() - 0.5) * 40,
      };
      nodesRef.current.push(n);
    }
    return n;
  }

  function addLink(sourceId, targetId) {
    const exists = linksRef.current.find(
      (l) => (l.source.id || l.source) === sourceId && (l.target.id || l.target) === targetId
    );
    if (!exists) linksRef.current.push({ source: sourceId, target: targetId });
  }

  async function loadSeed(work) {
    setMapMode("explore");
    axisRef.current = null;
    setLoadingMsg("Loading citation network…");
    setError(null);
    setSearchResults([]);
    setQuery("");
    resetFilters();
    try {
      const seedNode = addNode(work, "seed");
      setSelected(seedNode);

      const refIds = (work.referenced_works || []).slice(0, 18).map(shortId);
      if (refIds.length) {
        const r = await fetch(`${API}?filter=openalex_id:${refIds.join("|")}&per_page=50`);
        const rd = await r.json();
        (rd.results || []).forEach((w) => {
          if (!isUsableTitle(w.display_name)) return;
          if (!addNode(w, "reference")) return;
          addLink(shortId(w.id), seedNode.id);
        });
      }

      if (work.cited_by_api_url) {
        const c = await fetch(`${work.cited_by_api_url}&per_page=25`);
        const cd = await c.json();
        (cd.results || []).forEach((w) => {
          if (!isUsableTitle(w.display_name)) return;
          if (!addNode(w, "citation")) return;
          addLink(seedNode.id, shortId(w.id));
        });
      }
      restart(1);
      autosave();
    } catch (e) {
      setError("Could not load network.");
    } finally {
      setLoadingMsg(null);
    }
  }

  async function expandNode(n) {
    if (mapMode === "collection") return;
    setLoadingMsg(`Expanding "${n.label.slice(0, 40)}…"`);
    try {
      const full = await (await fetch(`${API}/${n.id}`)).json();
      const refIds = (full.referenced_works || []).slice(0, 12).map(shortId);
      if (refIds.length) {
        const r = await fetch(`${API}?filter=openalex_id:${refIds.join("|")}&per_page=40`);
        const rd = await r.json();
        (rd.results || []).forEach((w) => {
          if (!isUsableTitle(w.display_name)) return;
          if (!addNode(w, "reference")) return;
          addLink(shortId(w.id), n.id);
        });
      }
      if (full.cited_by_api_url) {
        const c = await fetch(`${full.cited_by_api_url}&per_page=15`);
        const cd = await c.json();
        (cd.results || []).forEach((w) => {
          if (!isUsableTitle(w.display_name)) return;
          if (!addNode(w, "citation")) return;
          addLink(n.id, shortId(w.id));
        });
      }
      restart(0.7);
      autosave();
    } catch (e) {
      setError("Expansion failed.");
    } finally {
      setLoadingMsg(null);
    }
  }

  // "Synchronize" (was "Monitor"): there's no push/webhook from Zotero, so
  // nothing updates automatically — this is the manual refresh. What it
  // does depends on the current map:
  //  - collection mode (built from a Zotero collection): re-fetch the
  //    collection from Zotero and rebuild the map, picking up anything
  //    added/removed there since the map was created.
  //  - explore mode (single-seed citation map): check OpenAlex for new
  //    articles citing the seed paper (unrelated to Zotero).
  function synchronize() {
    if (mapMode === "collection") {
      createCollectionMap();
    } else {
      checkForUpdates();
    }
  }

  async function checkForUpdates() {
    const seed = nodesRef.current.find((n) => n.kind === "seed");
    if (!seed) return;
    setLoadingMsg("Checking for new citing articles…");
    try {
      const full = await (await fetch(`${API}/${seed.id}`)).json();
      if (full.cited_by_api_url) {
        const c = await fetch(`${full.cited_by_api_url}&per_page=25`);
        const cd = await c.json();
        let added = 0;
        (cd.results || []).forEach((w) => {
          if (!isUsableTitle(w.display_name)) return;
          const id = shortId(w.id);
          const existed = nodesRef.current.some((n) => n.id === id);
          if (!addNode(w, "citation")) return;
          addLink(seed.id, id);
          if (!existed) added++;
        });
        restart(0.6);
        autosave();
        setSavedMsg(added > 0 ? `Found ${added} new citing article(s).` : "No new articles since last check.");
      }
    } catch (e) {
      setError("Check failed.");
    } finally {
      setLoadingMsg(null);
      setTimeout(() => setSavedMsg(""), 4000);
    }
  }

  // `collectionKeyOverride` lets callers build the map immediately after
  // picking/creating a collection without waiting for setSelectedCollectionKey
  // to actually land in state (React state updates aren't synchronous, so
  // reading `selectedCollectionKey` right after setting it can still see
  // the old value). `labelOverride` similarly lets a caller that just
  // created the collection pass its name directly, since `zoteroCollections`
  // state won't include it yet either at that point.
  async function createCollectionMap(collectionKeyOverride, labelOverride) {
    if (!zoteroConnected) {
      setShowZoteroPanel(true);
      setZoteroMsg("Connect to Zotero first.");
      return;
    }
    const key = collectionKeyOverride ?? selectedCollectionKey;
    const label =
      labelOverride ??
      (key === "" ? "main library" : zoteroCollections.find((c) => c.key === key)?.name || "collection");
    await ensureDraftProjectCreated(label === "main library" ? "Untitled Map" : label);

    setLoadingMsg(`Building map from ${label}…`);
    setError(null);
    setSelected(null);
    setHighlightId(null);
    resetFilters();
    try {
      if (simRef.current) simRef.current.stop();

      const items = await fetchZoteroItemsViaApi(key || null);
      const dois = items.map((it) => normalizeDoi(it.data.DOI)).filter(Boolean);
      if (!dois.length) {
        setError("No papers with DOIs found in this collection.");
        setLoadingMsg(null);
        return;
      }

      setLoadingMsg(`Looking up ${dois.length} papers on OpenAlex…`);
      const works = await fetchWorksByDois(dois);
      if (!works.length) {
        setError("No matching papers found on OpenAlex.");
        setLoadingMsg(null);
        return;
      }

      // Drop "Untitled" (no display_name on OpenAlex) and collapse
      // same-title duplicates (OpenAlex sometimes carries a preprint and
      // a published version as separate DB entries for the same paper).
      const collectionNodes = dedupeNodesByTitle(works.map((w) => workToNode(w, "collection")));
      const collectionIds = new Set(collectionNodes.map((n) => n.id));

      // --- Discovery: papers outside the collection that cite or are cited by it ---
      // Score external IDs by how often they appear as references of collection papers
      const refScore = new Map();
      collectionNodes.forEach((n) => {
        (n.referenced_works || []).forEach((refUrl) => {
          const id = shortId(refUrl);
          if (!collectionIds.has(id)) {
            refScore.set(id, (refScore.get(id) || 0) + 1);
          }
        });
      });

      setLoadingMsg("Finding citing papers outside the collection…");
      const citingScore = new Map();
      const citingLinks = []; // { source: citingId, target: collectionId }
      await mapPool(collectionNodes, 5, async (n) => {
        if (!n.cited_by_api_url) return;
        try {
          const res = await fetch(`${n.cited_by_api_url}&per_page=${MAX_CITING_PER_PAPER}`);
          if (!res.ok) return;
          const data = await res.json();
          (data.results || []).forEach((w) => {
            const id = shortId(w.id);
            if (collectionIds.has(id)) return;
            citingScore.set(id, (citingScore.get(id) || 0) + 1);
            citingLinks.push({ source: id, target: n.id });
          });
        } catch {
          /* ignore single-paper citing failures */
        }
      });

      // Prefer papers linked to multiple collection items, then fill up to cap
      const candidateScore = new Map();
      refScore.forEach((s, id) => candidateScore.set(id, (candidateScore.get(id) || 0) + s * 2));
      citingScore.forEach((s, id) => candidateScore.set(id, (candidateScore.get(id) || 0) + s));
      const rankedIds = [...candidateScore.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id)
        .slice(0, MAX_DISCOVERY_NODES);

      let discoveryNodes = [];
      if (rankedIds.length) {
        setLoadingMsg(`Loading ${rankedIds.length} discovery papers…`);
        const discoveryWorks = await fetchWorksByOpenAlexIds(rankedIds);
        // Dedupe against the collection too, not just amongst themselves —
        // collection nodes win any title collision (dedupeNodesByTitle's
        // kind priority), so a discovery "duplicate" of a paper already in
        // the collection gets dropped here rather than shown twice.
        discoveryNodes = dedupeNodesByTitle([
          ...collectionNodes,
          ...discoveryWorks.map((w) => workToNode(w, "discovery")),
        ]).filter((n) => n.kind === "discovery");
      }

      const discoveryIds = new Set(discoveryNodes.map((n) => n.id));
      const nodes = [...collectionNodes, ...discoveryNodes];
      const idSet = new Set(nodes.map((n) => n.id));

      const links = [];
      const neighborSets = new Map(nodes.map((n) => [n.id, new Set()]));
      const addEdge = (sourceId, targetId) => {
        if (!idSet.has(sourceId) || !idSet.has(targetId) || sourceId === targetId) return;
        if (links.some((l) => l.source === sourceId && l.target === targetId)) return;
        links.push({ source: sourceId, target: targetId });
        neighborSets.get(sourceId).add(targetId);
        neighborSets.get(targetId).add(sourceId);
      };

      // Collection → referenced work (collection or discovery)
      collectionNodes.forEach((n) => {
        (n.referenced_works || []).forEach((refUrl) => {
          addEdge(n.id, shortId(refUrl));
        });
      });

      // Discovery → collection (from cited_by lookups)
      citingLinks.forEach((l) => {
        if (discoveryIds.has(l.source)) addEdge(l.source, l.target);
      });

      // Discovery → collection via their own reference lists (extra coverage)
      discoveryNodes.forEach((n) => {
        (n.referenced_works || []).forEach((refUrl) => {
          const targetId = shortId(refUrl);
          if (collectionIds.has(targetId)) addEdge(n.id, targetId);
        });
      });

      nodes.forEach((n) => {
        n.internalDegree = neighborSets.get(n.id).size;
        n.tagId = paperTags[n.id] || null;
      });

      const forward = new Set(links.map((l) => `${l.source}->${l.target}`));
      links.forEach((l) => {
        l.mutual = forward.has(`${l.target}->${l.source}`);
      });

      nodesRef.current = nodes;
      linksRef.current = links;
      zoteroDoisRef.current = new Set(collectionNodes.map((n) => n.doi).filter(Boolean));
      setShowDiscovery(true);
      setMapMode("collection");
      setShowStartCard(false);
      layoutCollectionMap();
      setTick((t) => t + 1);
      requestAnimationFrame(() => resetZoom());
      autosave();

      const skipped = items.length - collectionNodes.length;
      setSavedMsg(
        `Map created: ${collectionNodes.length} in collection (filled), ${discoveryNodes.length} discovery (outlined), ${links.length} links` +
          (skipped > 0 ? ` · ${skipped} collection items skipped or merged as duplicates.` : ".")
      );
      setTimeout(() => setSavedMsg(""), 7000);
    } catch (e) {
      console.warn(e);
      setError(e?.message ? `Could not create collection map: ${e.message}` : "Could not create collection map.");
    } finally {
      setLoadingMsg(null);
    }
  }

  /** "Start this map from a single paper": creates a brand-new Zotero
   *  collection containing just that one paper, then builds a normal
   *  collection map from it — so the map behaves exactly like any other
   *  Zotero-backed map afterwards (Synchronize re-fetches it, more
   *  papers can be added to the same collection from Zotero directly, etc.),
   *  it just starts from a single seed instead of an existing collection. */
  async function createMapFromPaper(work) {
    if (!zoteroConnected) {
      dismissStartCard();
      setShowZoteroPanel(true);
      setZoteroMsg("Connect to Zotero first, then try again.");
      return;
    }
    setLoadingMsg(`Creating a collection for "${(work.display_name || "").slice(0, 40)}…"`);
    setError(null);
    try {
      const title = work.display_name || "Untitled paper";
      const colRes = await fetch("/api/zotero/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title.slice(0, 60) }),
      });
      const colData = await colRes.json();
      if (!colRes.ok) throw new Error(colData.error || "Failed to create collection");
      const newCollection = colData.collection;

      setLoadingMsg("Adding paper to Zotero…");
      const full = await (await fetch(`${API}/${shortId(work.id)}`)).json();
      const itemRes = await fetch("/api/zotero/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: {
            id: shortId(full.id),
            label: full.display_name,
            year: full.publication_year,
            doi: full.doi,
            authorships: full.authorships || [],
            primary_location: full.primary_location || null,
            abstract_inverted_index: full.abstract_inverted_index,
          },
          collectionKey: newCollection.key,
        }),
      });
      const itemResult = await itemRes.json();
      if (!(itemResult.successful && Object.keys(itemResult.successful).length > 0)) {
        throw new Error("Zotero rejected the paper");
      }

      setZoteroCollections((prev) =>
        [...prev, newCollection].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCollectionKey(newCollection.key);
      setShowStartCard(false);
      await createCollectionMap(newCollection.key, title);
    } catch (e) {
      console.warn(e);
      setError(e?.message ? `Could not start map from paper: ${e.message}` : "Could not start map from paper.");
      setLoadingMsg(null);
    }
  }

  // ---------- Zotero ----------
  // Phase 6: the Zotero API key never reaches this component (let alone the
  // browser's network tab) — every call below goes through the same-origin
  // /api/zotero/* route handlers, which hold the encrypted key server-side
  // (see src/app/api/zotero/*, src/lib/zotero-server.js, src/lib/crypto.js).
  // The session cookie (already on every request) is what authorizes them.

  async function fetchZoteroItemsViaApi(collectionKey) {
    const params = collectionKey ? `?collectionKey=${encodeURIComponent(collectionKey)}` : "";
    const res = await fetch(`/api/zotero/items${params}`);
    if (!res.ok) throw new Error("Failed to fetch Zotero items");
    const { items } = await res.json();
    return items;
  }

  async function syncDois(collectionKey) {
    const items = await fetchZoteroItemsViaApi(collectionKey || null);
    zoteroDoisRef.current = new Set(
      items.map((it) => normalizeDoi(it.data && it.data.DOI)).filter(Boolean)
    );
    setTick((t) => t + 1);
    return items.length;
  }

  /** On mount: if the user connected Zotero in a previous session, restore
   *  the UI (collections + synced DOIs) using the stored credentials —
   *  no re-entry of the API key needed. */
  async function restoreZoteroConnection() {
    try {
      const statusRes = await fetch("/api/zotero/credentials");
      if (!statusRes.ok) return;
      const status = await statusRes.json();
      if (!status.connected) return;

      const colRes = await fetch("/api/zotero/collections");
      if (!colRes.ok) return;
      const { collections } = await colRes.json();

      setZoteroUserId(status.zoteroUserId);
      setZoteroCollections(collections);
      setZoteroConnected(true);
      await syncDois(selectedCollectionKey);
    } catch {
      // Not connected yet, or the stored key stopped working — user can
      // reconnect via the Zotero panel same as a first-time setup.
    }
  }

  async function connectZotero(userIdArg, apiKeyArg) {
    const userId = (userIdArg ?? zoteroUserId).trim();
    const apiKey = (apiKeyArg ?? zoteroApiKey).trim();

    if (!userId || !apiKey) {
      setZoteroMsg("Please enter User ID and API key.");
      return;
    }
    setZoteroBusy(true);
    setZoteroMsg("Connecting to Zotero…");
    try {
      const res = await fetch("/api/zotero/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoteroUserId: userId, zoteroApiKey: apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");

      setZoteroCollections(data.collections);
      const count = await syncDois(selectedCollectionKey);
      setZoteroUserId(userId);
      setZoteroApiKey(""); // never held in memory longer than the request above needs it
      setZoteroConnected(true);
      setZoteroMsg(`Connected — ${data.collections.length} collections, synced ${count} entries.`);
    } catch (e) {
      setZoteroMsg(e.message || "Connection failed. Check User ID and API key.");
      setZoteroConnected(false);
      setZoteroCollections([]);
    } finally {
      setZoteroBusy(false);
      setTimeout(() => setZoteroMsg(""), 6000);
    }
  }

  async function disconnectZotero() {
    setZoteroBusy(true);
    try {
      await fetch("/api/zotero/credentials", { method: "DELETE" });
    } finally {
      setZoteroConnected(false);
      setZoteroCollections([]);
      setZoteroUserId("");
      setZoteroApiKey("");
      setSelectedCollectionKey("");
      zoteroDoisRef.current = new Set();
      setZoteroBusy(false);
      setZoteroMsg("Disconnected from Zotero.");
      setTimeout(() => setZoteroMsg(""), 4000);
    }
  }

  async function selectCollection(collectionKey) {
    setSelectedCollectionKey(collectionKey);
    if (!zoteroConnected) return;
    setZoteroBusy(true);
    const label =
      collectionKey === ""
        ? "main library"
        : zoteroCollections.find((c) => c.key === collectionKey)?.name || "collection";
    setZoteroMsg(`Syncing ${label}…`);
    try {
      const count = await syncDois(collectionKey);
      setZoteroMsg(`Using ${label} — synced ${count} entries.`);
    } catch (e) {
      setZoteroMsg("Failed to sync collection.");
    } finally {
      setZoteroBusy(false);
      setTimeout(() => setZoteroMsg(""), 4000);
    }
  }

  async function addToZotero(node) {
    if (!zoteroConnected) {
      setShowZoteroPanel(true);
      setZoteroMsg("Connect to Zotero first, then add.");
      return;
    }
    setAddingId(node.id);
    try {
      // Always re-fetch the full work — besides authorships/abstract (which
      // a bare discovery node may not carry yet), this is also where the
      // open-access PDF URL comes from, so it has to run every time, not
      // just when authorships are missing.
      const w = await (await fetch(`${API}/${node.id}`)).json();
      const full = {
        ...node,
        authorships: w.authorships || [],
        doi: normalizeDoi(w.doi),
        primary_location: w.primary_location || null,
        abstract_inverted_index: w.abstract_inverted_index,
        oaPdfUrl:
          w.best_oa_location?.pdf_url ||
          (w.open_access?.is_oa ? w.open_access?.oa_url : null) ||
          null,
      };

      const res = await fetch("/api/zotero/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node: full, collectionKey: selectedCollectionKey || null }),
      });
      const result = await res.json();
      if (result.successful && Object.keys(result.successful).length > 0) {
        if (full.doi) zoteroDoisRef.current.add(full.doi.toLowerCase());
        // Convert discovery outline → filled collection point on the map
        const mapNode = nodesRef.current.find((n) => n.id === node.id);
        if (mapNode && mapNode.kind === "discovery") {
          mapNode.kind = "collection";
          if (full.doi) mapNode.doi = full.doi;
        }
        if (selected && selected.id === node.id) {
          setSelected({ ...mapNode, kind: "collection" });
        }
        const title = full.label.slice(0, 40);
        setZoteroMsg(
          result.pdfAttached
            ? `Added "${title}…" to Zotero (with PDF).`
            : `Added "${title}…" to Zotero. No PDF available (not Open Access).`
        );
        setTick((t) => t + 1);
        // Without this, the discovery -> collection flip above only lives
        // in nodesRef until the next autosave happens to fire for some
        // other reason — a reload before that would reload the stale
        // "discovery" state and require a full manual Synchronize to fix.
        autosave();
      } else {
        setZoteroMsg("Zotero rejected the paper (see console).");
        console.warn(result);
      }
    } catch (e) {
      setZoteroMsg("Failed to add.");
    } finally {
      setAddingId(null);
      setTimeout(() => setZoteroMsg(""), 5000);
    }
  }

  // ---------- project snapshot: shared by Supabase autosave/restore and
  // manual JSON export/import (kept as a secondary offline-backup path) ----------

  /** Builds the same payload shape whether it's about to be autosaved to
   *  Supabase or downloaded as a JSON file. */
  function buildProjectPayload() {
    const collectionName =
      selectedCollectionKey === ""
        ? ""
        : zoteroCollections.find((c) => c.key === selectedCollectionKey)?.name || "";
    return {
      version: 2,
      app: "orblit",
      savedAt: new Date().toISOString(),
      mode: mapMode,
      nodes: nodesRef.current.map((n) => ({
        id: n.id,
        label: n.label,
        year: n.year,
        cited_by_count: n.cited_by_count,
        kind: n.kind,
        doi: n.doi || null,
        referenced_works: n.referenced_works || [],
        cited_by_api_url: n.cited_by_api_url || null,
        authorships: n.authorships || [],
        primary_location: n.primary_location || null,
        abstract: n.abstract != null ? n.abstract : undefined,
        internalDegree: n.internalDegree || 0,
        tagId: n.tagId || null,
        viaRecommendation: n.viaRecommendation || false,
        x: n.x,
        y: n.y,
      })),
      links: linksRef.current.map((l) => ({
        source: l.source.id || l.source,
        target: l.target.id || l.target,
        mutual: !!l.mutual,
      })),
      tags,
      paperTags,
      clusters: clusterResult,
      hiddenNodeIds: [...hiddenNodeIdsRef.current],
      ui: {
        viewMode,
        listScope,
        listTagFilter,
        listSort,
        listQuery,
        showLinks,
        showLabels,
        showDiscovery,
        logScale,
        mapHeight: Math.round(mapHeight),
        viewTransform: {
          k: viewTransform.k,
          x: viewTransform.x,
          y: viewTransform.y,
        },
        highlightId,
        selectedId: selected?.id || null,
      },
      zotero: {
        selectedCollectionKey,
        collectionName,
        dois: [...zoteroDoisRef.current],
      },
    };
  }

  /** Restores component state from a payload built by buildProjectPayload()
   *  — used both for the Supabase-loaded project on mount and when
   *  switching between saved maps in the projects panel. Throws on
   *  malformed data. */
  function applyProjectData(data) {
    if (!data || !Array.isArray(data.nodes)) {
      throw new Error("Missing nodes");
    }

    const mode =
          data.mode === "collection" ||
          data.nodes.some((n) => n.kind === "collection" || n.kind === "discovery")
            ? "collection"
            : data.mode === "explore"
              ? "explore"
              : "explore";

        // Tags
        if (Array.isArray(data.tags)) setTags(data.tags);
        let nextPaperTags = {};
        if (data.paperTags && typeof data.paperTags === "object") {
          nextPaperTags = data.paperTags;
          setPaperTags(data.paperTags);
        } else {
          data.nodes.forEach((n) => {
            if (n.tagId) nextPaperTags[n.id] = n.tagId;
          });
          if (Object.keys(nextPaperTags).length) setPaperTags(nextPaperTags);
        }

        // Graph
        nodesRef.current = data.nodes.map((n) => ({
          ...n,
          tagId: n.tagId || nextPaperTags[n.id] || null,
          referenced_works: n.referenced_works || [],
          authorships: n.authorships || [],
          x: n.x != null ? n.x : dimsRef.current.w / 2 + (Math.random() - 0.5) * 100,
          y: n.y != null ? n.y : dimsRef.current.h / 2 + (Math.random() - 0.5) * 100,
        }));
        linksRef.current = (data.links || []).map((l) => ({
          source: l.source,
          target: l.target,
          mutual: !!l.mutual,
        }));

        // Themes-view result (regenerated only on demand, never silently
        // dropped on reload/re-login)
        setClusterResult(data.clusters || null);
        hiddenNodeIdsRef.current = new Set(data.hiddenNodeIds || []);

        // UI state
        const ui = data.ui || {};
        if (ui.viewMode === "map" || ui.viewMode === "list" || ui.viewMode === "clusters") {
          setViewMode(ui.viewMode);
        }
        if (ui.listScope) setListScope(ui.listScope);
        if (ui.listTagFilter != null) setListTagFilter(ui.listTagFilter);
        if (ui.listSort) setListSort(ui.listSort);
        if (typeof ui.listQuery === "string") setListQuery(ui.listQuery);
        if (typeof ui.showLinks === "boolean") setShowLinks(ui.showLinks);
        if (typeof ui.showLabels === "boolean") setShowLabels(ui.showLabels);
        if (typeof ui.showDiscovery === "boolean") setShowDiscovery(ui.showDiscovery);
        if (typeof ui.logScale === "boolean") {
          logScaleRef.current = ui.logScale;
          setLogScale(ui.logScale);
        }
        if (typeof ui.mapHeight === "number") {
          setMapHeight(Math.round(Math.min(MAP_HEIGHT_MAX, Math.max(MAP_HEIGHT_MIN, ui.mapHeight))));
        }
        setHighlightId(ui.highlightId || null);

        // Zotero metadata (no secrets)
        if (data.zotero) {
          if (Array.isArray(data.zotero.dois)) {
            zoteroDoisRef.current = new Set(
              data.zotero.dois.map((d) => String(d).toLowerCase()).filter(Boolean)
            );
          }
          if (typeof data.zotero.selectedCollectionKey === "string") {
            setSelectedCollectionKey(data.zotero.selectedCollectionKey);
          }
        } else {
          zoteroDoisRef.current = new Set(
            nodesRef.current.filter((n) => n.kind === "collection" && n.doi).map((n) => n.doi.toLowerCase())
          );
        }

        setMapMode(mode);
        setSearchResults([]);
        setQuery("");
        setError(null);

        if (mode === "collection") {
          if (simRef.current) simRef.current.stop();
          // Keep saved positions if present; only rebuild scales/axes
          if (nodesRef.current.every((n) => n.x == null || n.y == null)) {
            layoutCollectionMap();
          } else {
            // Recompute axes from saved positions' year/cite domains
            layoutCollectionMap();
            // Restore exact saved coordinates after layout
            const byId = new Map(data.nodes.map((n) => [n.id, n]));
            nodesRef.current.forEach((n) => {
              const saved = byId.get(n.id);
              if (saved && saved.x != null && saved.y != null) {
                n.x = saved.x;
                n.y = saved.y;
                n.fx = n.x;
                n.fy = n.y;
              }
            });
          }
        } else {
          axisRef.current = null;
          restart(1);
        }

    const selId = ui.selectedId;
    const sel = selId ? nodesRef.current.find((n) => n.id === selId) : null;
    setSelected(sel || nodesRef.current.find((n) => n.kind === "seed") || null);
    setTick((t) => t + 1);

    // Restore zoom after paint
    const vt = ui.viewTransform;
    requestAnimationFrame(() => {
      if (vt && zoomBehaviorRef.current && svgRef.current && typeof vt.k === "number") {
        const t = d3.zoomIdentity.translate(vt.x || 0, vt.y || 0).scale(Math.max(1, vt.k));
        applyZoomTransform(t);
      } else {
        resetZoom();
      }
    });
  }

  // ---------- drag (explore mode only) ----------
  function pointerToPlot(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const [x, y] = transformRef.current.invert([e.clientX - rect.left, e.clientY - rect.top]);
    return { x, y };
  }

  function onPointerDown(n, e) {
    if (mapMode === "collection") return;
    e.stopPropagation();
    dragNode.current = n;
    simRef.current.alphaTarget(0.3).restart();
  }
  function onPointerMove(e) {
    if (!dragNode.current || mapMode === "collection") return;
    const p = pointerToPlot(e);
    dragNode.current.fx = p.x;
    dragNode.current.fy = p.y;
  }
  function onPointerUp() {
    if (dragNode.current && mapMode !== "collection") {
      dragNode.current.fx = null;
      dragNode.current.fy = null;
      simRef.current.alphaTarget(0);
      autosave();
    }
    dragNode.current = null;
  }

  const axis = axisRef.current;
  const collectionLabel =
    selectedCollectionKey === ""
      ? "Main library"
      : zoteroCollections.find((c) => c.key === selectedCollectionKey)?.name || "Collection";

  // Filter bounds + per-node link (degree) counts, derived fresh from the
  // current graph each render — cheap even during simulation ticks, and
  // keeps the filter sliders' min/max in sync with whatever's on the map.
  const filterDegreeById = new Map();
  linksRef.current.forEach((l) => {
    const sid = l.source.id || l.source;
    const tid = l.target.id || l.target;
    filterDegreeById.set(sid, (filterDegreeById.get(sid) || 0) + 1);
    filterDegreeById.set(tid, (filterDegreeById.get(tid) || 0) + 1);
  });
  const filterCitations = nodesRef.current.map((n) => n.cited_by_count || 0);
  const filterYears = nodesRef.current.map((n) => n.year).filter((y) => y != null);
  const filterLinkCounts = nodesRef.current.map((n) => filterDegreeById.get(n.id) || 0);
  const filterBounds = {
    citMin: filterCitations.length ? Math.min(...filterCitations) : 0,
    citMax: filterCitations.length ? Math.max(...filterCitations) : 0,
    yearMin: filterYears.length ? Math.min(...filterYears) : new Date().getFullYear(),
    yearMax: filterYears.length ? Math.max(...filterYears) : new Date().getFullYear(),
    linksMin: filterLinkCounts.length ? Math.min(...filterLinkCounts) : 0,
    linksMax: filterLinkCounts.length ? Math.max(...filterLinkCounts) : 0,
  };
  const filtersActive = !!(citRange || yearRange || linksRange);
  function passesFilters(n) {
    if (citRange) {
      const c = n.cited_by_count || 0;
      if (c < citRange[0] || c > citRange[1]) return false;
    }
    if (yearRange && n.year != null) {
      if (n.year < yearRange[0] || n.year > yearRange[1]) return false;
    }
    if (linksRange) {
      const deg = filterDegreeById.get(n.id) || 0;
      if (deg < linksRange[0] || deg > linksRange[1]) return false;
    }
    return true;
  }

  return (
    <div
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        background: "#0B1220",
        color: "#E8E6DE",
        // height (not minHeight) pins the page itself in place — without
        // this the whole document (header, toolbar, and all) scrolled
        // together whenever list content overflowed, since nothing was
        // actually stopping the page from just growing taller than the
        // viewport. Intentionally-scrollable regions inside (the paper
        // list's own div) handle their own overflow independently.
        //
        // overflowY is "auto", not "hidden": mapHeight defaults to
        // window.innerHeight - 220 (see defaultMapHeight in
        // citation-graph.js), which assumes the header/toolbar above it
        // fits in ~220px. On narrower tablet widths the toolbar's
        // flex-wrap pushes it onto two or three lines, so that assumption
        // undershoots and total content height (header + the fixed-height
        // map/list row below) exceeds 100vh. With overflow:hidden that
        // excess was simply clipped with no way to reach it — the "can't
        // scroll on tablet" bug. auto keeps the exact same pinned look
        // whenever content does fit (no scrollbar appears) but lets the
        // whole page scroll as a fallback when it doesn't.
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid #1E2A42" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 22, letterSpacing: 0.5 }}>OrbLit — Citation Explorer</span>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#7C8AA3" }}>
            Powered by OpenAlex + Zotero
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setShowProjectsPanel((s) => !s)}
            style={{
              ...btnStyle(),
              flexShrink: 0,
              maxWidth: 180,
              background: showProjectsPanel ? "#24314C" : "#1a2740",
            }}
            title="Your saved maps"
          >
            <FolderOpen size={14} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {projects.find((p) => p.id === activeProjectId)?.name || "Maps"}
            </span>
          </button>
          <div
            style={{
              display: "flex",
              gap: 8,
              flex: "1 1 320px",
              minWidth: 240,
              maxWidth: "100%",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#7C8AA3", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
                placeholder="Search papers (highlight on map)…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#121B2E",
                  border: "1px solid #24314C",
                  borderRadius: 6,
                  padding: "8px 10px 8px 32px",
                  color: "#E8E6DE",
                  fontFamily: "ui-sans-serif, system-ui",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <button onClick={() => doSearch(query)} style={{ ...btnStyle(), flexShrink: 0 }}>
              {searching ? <Loader2 size={14} className="spin" /> : "Search"}
            </button>
          </div>
          <button
            onClick={synchronize}
            style={{ ...btnStyle(), flexShrink: 0 }}
            title={
              mapMode === "collection"
                ? "Re-fetch this collection from Zotero and rebuild the map"
                : "Check OpenAlex for new articles citing this paper"
            }
          >
            <RefreshCw size={14} /> Synchronize
          </button>
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              border: "1px solid #2c3b5a",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setViewMode("map")}
              style={{
                ...btnStyle(),
                border: "none",
                borderRadius: 0,
                background: viewMode === "map" ? "#24314C" : "#1a2740",
              }}
              title="Map view"
            >
              <MapIcon size={14} /> Map
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                ...btnStyle(),
                border: "none",
                borderRadius: 0,
                borderLeft: "1px solid #2c3b5a",
                background: viewMode === "list" ? "#24314C" : "#1a2740",
              }}
              title="List view"
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setViewMode("clusters")}
              style={{
                ...btnStyle(),
                border: "none",
                borderRadius: 0,
                borderLeft: "1px solid #2c3b5a",
                background: viewMode === "clusters" ? "#24314C" : "#1a2740",
              }}
              title="Thematic clusters"
            >
              <Sparkles size={14} /> Themes
            </button>
          </div>
          <button
            onClick={() => setShowTagsPanel((s) => !s)}
            style={{
              ...btnStyle(),
              flexShrink: 0,
              background: showTagsPanel ? "#24314C" : "#1a2740",
            }}
            title="Manage colored tags"
          >
            <Tag size={14} /> Tags
          </button>
          <button
            onClick={() => setShowZoteroPanel((s) => !s)}
            style={{
              ...btnStyle(),
              flexShrink: 0,
              background: zoteroConnected ? "#1f3a30" : "#1a2740",
              borderColor: zoteroConnected ? "#2f5a45" : "#2c3b5a",
            }}
          >
            <Library size={14} /> {zoteroConnected ? "Zotero connected" : "Zotero"}
          </button>
        </div>

        {showProjectsPanel && (
          <ProjectsPanel
            projects={projects}
            activeProjectId={activeProjectId}
            switching={switchingProjectId}
            onSelect={switchToProject}
            onCreate={handleCreateProject}
            onDelete={handleDeleteProject}
            onRename={handleRenameProject}
          />
        )}

        {showTagsPanel && (
          <TagsPanel
            tags={tags}
            newTagName={newTagName}
            setNewTagName={setNewTagName}
            newTagColor={newTagColor}
            setNewTagColor={setNewTagColor}
            createTag={createTag}
            deleteTag={deleteTag}
          />
        )}

        {showZoteroPanel && (
          <div
            style={{
              marginTop: 10,
              background: "#121B2E",
              border: "1px solid #24314C",
              borderRadius: 8,
              padding: 12,
              fontFamily: "ui-sans-serif, system-ui",
              fontSize: 12,
            }}
          >
            <div style={{ color: "#7C8AA3", marginBottom: 8 }}>
              Your API key is encrypted and stored on our server — it never
              stays in this browser tab after connecting. Create a key at{" "}
              <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#4FD1C5" }}>
                zotero.org/settings/keys
              </a>
              . Choose a collection in the toolbar after connecting.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={zoteroUserId}
                onChange={(e) => setZoteroUserId(e.target.value)}
                placeholder="User ID"
                disabled={zoteroConnected}
                style={{ ...inputStyle(), width: 140 }}
              />
              <input
                value={zoteroApiKey}
                onChange={(e) => setZoteroApiKey(e.target.value)}
                placeholder={zoteroConnected ? "Connected" : "API key"}
                type="password"
                disabled={zoteroConnected}
                style={{ ...inputStyle(), width: 160 }}
              />
              {zoteroConnected ? (
                <button onClick={disconnectZotero} style={btnStyle()}>
                  {zoteroBusy ? <Loader2 size={14} className="spin" /> : "Disconnect"}
                </button>
              ) : (
                <button onClick={() => connectZotero()} style={btnStyle()}>
                  {zoteroBusy ? <Loader2 size={14} className="spin" /> : "Connect"}
                </button>
              )}
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginTop: 10, background: "#121B2E", border: "1px solid #24314C", borderRadius: 8, overflow: "hidden" }}>
            {searchResults.map((w) => (
              <div
                key={w.id}
                onClick={() => focusSearchResult(w)}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #1E2A42", fontFamily: "ui-sans-serif, system-ui" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1a2740")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ color: "#E8E6DE" }}>{w.display_name}</div>
                <div style={{ color: "#7C8AA3", fontSize: 11, marginTop: 2 }}>
                  {w.publication_year} · {w.cited_by_count} citations
                </div>
              </div>
            ))}
          </div>
        )}

        {(loadingMsg || error || savedMsg || zoteroMsg || tagError) && (
          <div style={{ marginTop: 8, fontSize: 12, fontFamily: "ui-sans-serif, system-ui" }}>
            {loadingMsg && <span style={{ color: "#7C8AA3" }}>{loadingMsg}</span>}
            {error && <span style={{ color: "#E07856" }}>{error}</span>}
            {savedMsg && <span style={{ color: "#4FD1C5" }}>{savedMsg}</span>}
            {zoteroMsg && <span style={{ color: "#4FD1C5" }}> {zoteroMsg}</span>}
            {tagError && <span style={{ color: "#E07856" }}> {tagError}</span>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, height: mapHeight + 12 }}>
        {/* Map view (kept mounted so zoom state persists) */}
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            display: viewMode === "map" ? "flex" : "none",
            flexDirection: "column",
          }}
        >
          {showStartCard && (
            <NewMapCard
              zoteroConnected={zoteroConnected}
              zoteroCollections={zoteroCollections}
              selectedCollectionKey={selectedCollectionKey}
              onSelectCollection={selectCollection}
              onCreateMap={() => createCollectionMap()}
              onCreateFromPaper={createMapFromPaper}
              onConnectZotero={() => {
                dismissStartCard();
                setShowZoteroPanel(true);
              }}
              busy={zoteroBusy}
              loading={!!loadingMsg}
              onDismiss={dismissStartCard}
            />
          )}
          {/* Map exploration controls */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "#121B2E",
              borderBottom: "1px solid #1E2A42",
              fontFamily: "ui-sans-serif, system-ui",
              flex: "0 0 auto",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
              <button onClick={() => zoomBy(1.3)} style={iconBtnStyle()} title="Zoom in">
                <ZoomIn size={14} />
              </button>
              <button onClick={() => zoomBy(1 / 1.3)} style={iconBtnStyle()} title="Zoom out">
                <ZoomOut size={14} />
              </button>
              <button onClick={fitView} style={iconBtnStyle()} title="Fit to view">
                <Maximize2 size={14} />
              </button>
              <button onClick={resetZoom} style={{ ...iconBtnStyle(), fontSize: 10, padding: "0 8px" }} title="Reset zoom">
                {Math.round(viewTransform.k * 100)}%
              </button>
              <button
                onClick={fillViewportHeight}
                style={{ ...iconBtnStyle(), fontSize: 10, padding: "0 8px", minWidth: 48 }}
                title="Fit map height to viewport"
              >
                {Math.round(mapHeight)}px
              </button>
              <span style={{ width: 1, height: 20, background: "#2c3b5a", margin: "0 4px" }} />
              <button
                onClick={() => setShowLinks((v) => !v)}
                style={{
                  ...iconBtnStyle(),
                  background: showLinks ? "#1a2740" : "#121820",
                  opacity: showLinks ? 1 : 0.7,
                }}
                title={showLinks ? "Hide links" : "Show links"}
              >
                {showLinks ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => setShowLabels((v) => !v)}
                style={{
                  ...iconBtnStyle(),
                  background: showLabels ? "#24314C" : "#1a2740",
                }}
                title={showLabels ? "Hide labels" : "Show labels"}
              >
                <Tag size={14} />
              </button>
              <button
                onClick={() => setShowFiltersPanel((v) => !v)}
                style={{
                  ...iconBtnStyle(),
                  background: filtersActive || showFiltersPanel ? "#24314C" : "#1a2740",
                }}
                title="Filter by citations, year, or network links"
              >
                <SlidersHorizontal size={14} />
              </button>
              {mapMode === "collection" && (
                <>
                  <button
                    onClick={() => setShowDiscovery((v) => !v)}
                    style={{
                      ...iconBtnStyle(),
                      fontSize: 10,
                      padding: "0 8px",
                      background: showDiscovery ? "#1a2740" : "#121820",
                      borderColor: "#2c3b5a",
                      color: "#E8E6DE",
                      minWidth: 64,
                      opacity: showDiscovery ? 1 : 0.7,
                    }}
                    title={showDiscovery ? "Hide discovery papers" : "Show discovery papers"}
                  >
                    discovery
                  </button>
                  <button
                    onClick={toggleLogScale}
                    style={{
                      ...iconBtnStyle(),
                      fontSize: 10,
                      padding: "0 8px",
                      background: logScale ? "#24314C" : "#1a2740",
                      minWidth: 52,
                    }}
                    title="Toggle log scale for citations"
                  >
                    {logScale ? "log Y" : "lin Y"}
                  </button>
                </>
              )}
            </div>
            <div style={{ fontSize: 10, color: "#7C8AA3", whiteSpace: "nowrap" }}>
              {mapMode === "collection" ? (
                <>
                  <span style={{ color: "#E8E6DE" }}>●</span> in collection{" "}
                  <span style={{ color: "#E8E6DE" }}>○</span> discovery
                  {nodesRef.current.some((n) => n.viaRecommendation) && (
                    <>
                      {" "}
                      <span style={{ color: "#E8E6DE" }}>▢</span> suggested
                    </>
                  )}
                  {tags.length > 0 && " · tags tint nodes"} · scroll to zoom
                </>
              ) : (
                <>Scroll to zoom · drag background to pan</>
              )}
            </div>
          </div>

          {showFiltersPanel && (
            <div style={{ padding: "0 12px" }}>
              <FiltersPanel
                bounds={filterBounds}
                citRange={citRange}
                setCitRange={setCitRange}
                yearRange={yearRange}
                setYearRange={setYearRange}
                linksRange={linksRange}
                setLinksRange={setLinksRange}
                onReset={resetFilters}
              />
            </div>
          )}

          <svg
            ref={svgRef}
            width="100%"
            height={mapHeight}
            style={{ background: "#0B1220", display: "block", touchAction: "none", cursor: "grab", flex: "0 0 auto" }}
          >
            <defs>
              <marker
                id="arrow-white"
                viewBox="0 0 8 8"
                refX="6"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="#FFFFFF" />
              </marker>
            </defs>

            <rect className="plot-bg" width="100%" height="100%" fill="#0B1220" />

            <g transform={`translate(${viewTransform.x},${viewTransform.y}) scale(${viewTransform.k})`}>
              {mapMode === "collection" && axis && (
                <g style={{ fontFamily: "ui-sans-serif, system-ui", fontSize: 11 }}>
                  {axis.xTicks.map((t) => (
                    <g key={`x-${t.value}`}>
                      <line x1={t.x} y1={PLOT.top} x2={t.x} y2={axis.h - PLOT.bottom} stroke="#1E2A42" strokeWidth={1} />
                      <text x={t.x} y={axis.h - PLOT.bottom + 18} fill="#7C8AA3" textAnchor="middle">
                        {t.value}
                      </text>
                    </g>
                  ))}
                  {axis.yTicks.map((t) => (
                    <g key={`y-${t.value}`}>
                      <line x1={PLOT.left} y1={t.y} x2={axis.w - PLOT.right} y2={t.y} stroke="#1E2A42" strokeWidth={1} />
                      <text x={PLOT.left - 8} y={t.y + 3} fill="#7C8AA3" textAnchor="end">
                        {t.value}
                      </text>
                    </g>
                  ))}
                  <text
                    x={(PLOT.left + axis.w - PLOT.right) / 2}
                    y={axis.h - 10}
                    fill="#7C8AA3"
                    textAnchor="middle"
                    fontSize={12}
                  >
                    {axis.xLabel}
                  </text>
                  <text
                    x={16}
                    y={(PLOT.top + axis.h - PLOT.bottom) / 2}
                    fill="#7C8AA3"
                    textAnchor="middle"
                    fontSize={12}
                    transform={`rotate(-90, 16, ${(PLOT.top + axis.h - PLOT.bottom) / 2})`}
                  >
                    {axis.yLabel}
                  </text>
                </g>
              )}

              {showLinks &&
                linksRef.current.map((l, i) => {
                  const s = typeof l.source === "object" ? l.source : nodesRef.current.find((n) => n.id === l.source);
                  const t = typeof l.target === "object" ? l.target : nodesRef.current.find((n) => n.id === l.target);
                  if (!s || !t || s.x == null || t.x == null) return null;
                  if (hiddenNodeIdsRef.current.has(s.id) || hiddenNodeIdsRef.current.has(t.id)) {
                    return null;
                  }
                  if (
                    mapMode === "collection" &&
                    !showDiscovery &&
                    (s.kind === "discovery" || t.kind === "discovery")
                  ) {
                    return null;
                  }
                  if (filtersActive && (!passesFilters(s) || !passesFilters(t))) return null;
                  const linkDimmed =
                    highlightId && s.id !== highlightId && t.id !== highlightId;

                  if (mapMode === "collection") {
                    const sid = s.id;
                    const tid = t.id;
                    const curveSign = l.mutual ? (sid < tid ? 1 : -1) : 0;
                    const ep = edgeEndpoints(s, t, curveSign);
                    if (ep.curved) {
                      return (
                        <path
                          key={i}
                          d={`M ${ep.x1} ${ep.y1} Q ${ep.mx} ${ep.my} ${ep.x2} ${ep.y2}`}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={0.9 / viewTransform.k}
                          opacity={linkDimmed ? 0.08 : 0.55}
                          markerEnd="url(#arrow-white)"
                        />
                      );
                    }
                    return (
                      <line
                        key={i}
                        x1={ep.x1}
                        y1={ep.y1}
                        x2={ep.x2}
                        y2={ep.y2}
                        stroke="#FFFFFF"
                        strokeWidth={0.9 / viewTransform.k}
                        opacity={linkDimmed ? 0.08 : 0.55}
                        markerEnd="url(#arrow-white)"
                      />
                    );
                  }

                  return (
                    <line
                      key={i}
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke="#24314C"
                      strokeWidth={1 / viewTransform.k}
                      opacity={linkDimmed ? 0.15 : 1}
                    />
                  );
                })}

              {nodesRef.current.map((n) => {
                if (hiddenNodeIdsRef.current.has(n.id)) return null;
                if (mapMode === "collection" && !showDiscovery && n.kind === "discovery") return null;
                if (filtersActive && !passesFilters(n)) return null;
                const isHighlight = highlightId === n.id;
                const dimmed = highlightId && !isHighlight;
                const paint = nodePaint(n, tags);
                const isRecommended = !!n.viaRecommendation;
                const r = nodeRadius(n);
                return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onPointerDown={(e) => onPointerDown(n, e)}
                  onClick={() => {
                    setHighlightId(null);
                    selectNode(n);
                  }}
                  onDoubleClick={() => expandNode(n)}
                  style={{ cursor: "pointer" }}
                >
                  {isHighlight &&
                    (isRecommended ? (
                      <rect
                        x={-(r + 8)}
                        y={-(r + 8)}
                        width={(r + 8) * 2}
                        height={(r + 8) * 2}
                        rx={(r + 8) * 0.18}
                        fill="none"
                        stroke="#FFD166"
                        strokeWidth={2.5 / viewTransform.k}
                        opacity={0.95}
                      />
                    ) : (
                      <circle
                        r={r + 8}
                        fill="none"
                        stroke="#FFD166"
                        strokeWidth={2.5 / viewTransform.k}
                        opacity={0.95}
                      />
                    ))}
                  {isRecommended ? (
                    <rect
                      x={-r}
                      y={-r}
                      width={r * 2}
                      height={r * 2}
                      rx={r * 0.18}
                      fill={paint.fill}
                      stroke={
                        isHighlight || (selected && selected.id === n.id)
                          ? "#FFD166"
                          : paint.stroke
                      }
                      strokeWidth={
                        (isHighlight || (selected && selected.id === n.id)
                          ? 2.5
                          : paint.outline
                            ? 1.8
                            : 1) / viewTransform.k
                      }
                      opacity={dimmed ? 0.18 : 0.92}
                    />
                  ) : (
                    <circle
                      r={r}
                      fill={paint.fill}
                      stroke={
                        isHighlight || (selected && selected.id === n.id)
                          ? "#FFD166"
                          : paint.stroke
                      }
                      strokeWidth={
                        (isHighlight || (selected && selected.id === n.id)
                          ? 2.5
                          : paint.outline
                            ? 1.8
                            : 1) / viewTransform.k
                      }
                      opacity={dimmed ? 0.18 : 0.92}
                    />
                  )}
                  {mapMode !== "collection" && n.doi && zoteroDoisRef.current.has(n.doi.toLowerCase()) && (
                    <circle
                      r={r + 4}
                      fill="none"
                      stroke="#5DBE6B"
                      strokeWidth={1.5 / viewTransform.k}
                      strokeDasharray={`${2 / viewTransform.k},${2 / viewTransform.k}`}
                      opacity={dimmed ? 0.2 : 1}
                    />
                  )}
                  {showLabels && (
                    <text
                      y={nodeRadius(n) + 12}
                      textAnchor="middle"
                      fill="#E8E6DE"
                      fontSize={10 / viewTransform.k}
                      fontFamily="ui-sans-serif, system-ui"
                      style={{ pointerEvents: "none" }}
                      opacity={dimmed ? 0.2 : 1}
                    >
                      {n.label.length > 36 ? `${n.label.slice(0, 34)}…` : n.label}
                    </text>
                  )}
                </g>
              );
              })}
            </g>
          </svg>

          {/* Height resize handle */}
          <div
            onPointerDown={onMapHeightResizeStart}
            title="Drag to resize map height"
            style={{
              height: 10,
              cursor: "ns-resize",
              background: "#121B2E",
              borderTop: "1px solid #1E2A42",
              borderBottom: "1px solid #1E2A42",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
              userSelect: "none",
            }}
          >
            <div style={{ width: 36, height: 3, borderRadius: 2, background: "#3A4A68" }} />
          </div>
        </div>

        {/* List view */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: viewMode === "list" ? "flex" : "none",
            flexDirection: "column",
            background: "#0B1220",
            borderRight: "1px solid #1E2A42",
            fontFamily: "ui-sans-serif, system-ui",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #1E2A42",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Filter by title, DOI, year…"
              style={{ ...inputStyle(), flex: "1 1 180px", minWidth: 140 }}
            />
            <select
              value={listScope}
              onChange={(e) => setListScope(e.target.value)}
              style={{ ...inputStyle(), width: "auto", cursor: "pointer" }}
              title="Collection scope"
            >
              <option value="all">All papers</option>
              <option value="collection">In collection</option>
              <option value="discovery">Out of collection</option>
            </select>
            <select
              value={listTagFilter}
              onChange={(e) => setListTagFilter(e.target.value)}
              style={{ ...inputStyle(), width: "auto", cursor: "pointer" }}
              title="Tag filter"
            >
              <option value="all">All tags</option>
              <option value="none">Untagged</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  Tag: {t.name}
                </option>
              ))}
            </select>
            <select
              value={listSort}
              onChange={(e) => setListSort(e.target.value)}
              style={{ ...inputStyle(), width: "auto", cursor: "pointer" }}
              title="Sort"
            >
              <option value="year-desc">Year ↓</option>
              <option value="year-asc">Year ↑</option>
              <option value="citations-desc">Citations ↓</option>
              <option value="citations-asc">Citations ↑</option>
              <option value="links-desc">Links ↓</option>
              <option value="links-asc">Links ↑</option>
              <option value="title-asc">Title A–Z</option>
              <option value="title-desc">Title Z–A</option>
            </select>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 11, color: "#7C8AA3", borderBottom: "1px solid #1E2A42" }}>
            {(() => {
              const filtered = getFilteredListNodes();
              return `${filtered.length} of ${nodesRef.current.length} papers`;
            })()}
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: mapHeight - 80 }}>
            {nodesRef.current.length === 0 ? (
              <div style={{ padding: 24, color: "#7C8AA3", fontSize: 13 }}>
                No papers on the map yet. Create a map from a Zotero collection first.
              </div>
            ) : (
              getFilteredListNodes().map((n) => {
                const tag = n.tagId ? tags.find((t) => t.id === n.tagId) : null;
                const paint = nodePaint(n, tags);
                const isSel = selected && selected.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setHighlightId(n.id);
                      selectNode(n);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid #1E2A42",
                      cursor: "pointer",
                      background: isSel ? "#1a2740" : "transparent",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel) e.currentTarget.style.background = "#121B2E";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSel ? "#1a2740" : "transparent";
                    }}
                  >
                    <span
                      title={
                        n.viaRecommendation
                          ? "Suggested — not cited by/citing your collection"
                          : n.kind === "discovery"
                            ? "Out of collection"
                            : n.kind === "collection"
                              ? "In collection"
                              : n.kind
                      }
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: n.viaRecommendation ? 3 : "50%",
                        marginTop: 3,
                        flexShrink: 0,
                        background: paint.outline ? "transparent" : paint.color,
                        border: `2px solid ${paint.stroke}`,
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#E8E6DE", fontSize: 13, lineHeight: 1.35 }}>{n.label}</div>
                      <div style={{ color: "#7C8AA3", fontSize: 11, marginTop: 3 }}>
                        {n.year || "—"} · {n.cited_by_count || 0} citations
                        {(n.kind === "collection" || n.kind === "discovery") && (
                          <> · {n.internalDegree || 0} links</>
                        )}
                        {" · "}
                        {n.kind === "collection"
                          ? "in collection"
                          : n.kind === "discovery"
                            ? "out of collection"
                            : n.kind}
                        {n.viaRecommendation && (
                          <>
                            {" · "}
                            <span style={{ color: "#4FD1C5" }}>suggested</span>
                          </>
                        )}
                        {tag && (
                          <>
                            {" · "}
                            <span style={{ color: tag.color }}>{tag.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showNodeOnMap(n);
                      }}
                      style={{ ...iconBtnStyle(), width: 28, height: 28, flexShrink: 0 }}
                      title="Show on map"
                    >
                      <MapIcon size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Thematic clusters view */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: viewMode === "clusters" ? "flex" : "none",
            flexDirection: "column",
            background: "#0B1220",
            borderRight: "1px solid #1E2A42",
            padding: 14,
            boxSizing: "border-box",
          }}
        >
          <ClusterMap
            collectionNodes={nodesRef.current.filter((n) => n.kind === "collection")}
            discoveryNodes={nodesRef.current.filter((n) => n.kind === "discovery")}
            selectedId={selected?.id}
            result={clusterResult}
            onResultChange={({ resolved, ...next }) => {
              // Abstracts the fallback chain (Semantic Scholar/Crossref)
              // found for papers OpenAlex had none for — store them on the
              // node permanently so future Generate runs (and the sidebar)
              // don't need to re-fetch the same paper's abstract again.
              if (resolved && Object.keys(resolved).length) {
                nodesRef.current.forEach((n) => {
                  if (resolved[n.id]) n.abstract = resolved[n.id];
                });
              }
              setClusterResult(next);
              autosave();
            }}
            onSelectNode={(id) => {
              const n = nodesRef.current.find((node) => node.id === id);
              if (n) {
                setHighlightId(n.id);
                selectNode(n);
              }
            }}
            onAddDiscoveryNodes={(newNodes) => {
              // Papers "Suggest related papers" found — merge in as regular
              // discovery nodes (same dedup rules as any other map build)
              // so they immediately participate in the list/network views
              // too, not just here.
              const existingIds = new Set(nodesRef.current.map((n) => n.id));
              const candidates = newNodes
                .filter((n) => !existingIds.has(n.id))
                .map((n) => ({ ...n, viaRecommendation: true }));
              const merged = dedupeNodesByTitle([...nodesRef.current, ...candidates]);
              const toAdd = merged.filter((n) => !existingIds.has(n.id));
              if (toAdd.length) {
                nodesRef.current = [...nodesRef.current, ...toAdd];
                setTick((t) => t + 1);
                autosave();
              }
              return toAdd.length;
            }}
            onClearSuggested={() => {
              const removedIds = new Set(
                nodesRef.current.filter((n) => n.viaRecommendation).map((n) => n.id)
              );
              if (!removedIds.size) return 0;
              nodesRef.current = nodesRef.current.filter((n) => !removedIds.has(n.id));
              linksRef.current = linksRef.current.filter((l) => {
                const sourceId = l.source.id || l.source;
                const targetId = l.target.id || l.target;
                return !removedIds.has(sourceId) && !removedIds.has(targetId);
              });
              if (selected && removedIds.has(selected.id)) {
                setSelected(null);
                setHighlightId(null);
              }
              // The cluster layout would otherwise still reference removed
              // ids — clear it rather than show stale/phantom points, the
              // user just clicks Generate again.
              setClusterResult(null);
              setTick((t) => t + 1);
              autosave();
              return removedIds.size;
            }}
          />
        </div>

        <div
          style={{
            // Flexible rather than a fixed 300px — a wider panel wraps
            // long titles/abstracts into fewer lines, so scrolling inside
            // it is only needed for genuinely long content instead of
            // routinely.
            width: "clamp(300px, 24vw, 460px)",
            flexShrink: 0,
            borderLeft: "1px solid #1E2A42",
            padding: 16,
            fontFamily: "ui-sans-serif, system-ui",
            fontSize: 13,
            // position: sticky (not just a height-bounded parent) is what
            // actually keeps this panel visually pinned in place while the
            // paper list next to it scrolls, regardless of exactly how the
            // surrounding layout's scroll containers are set up.
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            maxHeight: mapHeight + 12,
            overflowY: "auto",
          }}
        >
          {!selected && nodesRef.current.length === 0 && (
            <div style={{ color: "#7C8AA3", lineHeight: 1.6 }}>
              <BookOpen size={18} style={{ marginBottom: 8 }} />
              <p>Search above for an article, or connect Zotero and click Create Map for a collection overview.</p>
              <p style={{ marginTop: 10 }}>Click = details · Double-click = expand · Scroll = zoom</p>
            </div>
          )}
          {selected && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 1,
                    color: nodePaint(selected, tags).color,
                    textTransform: "uppercase",
                  }}
                >
                  {selected.kind === "seed"
                    ? "Seed"
                    : selected.kind === "citation"
                      ? "Cited by"
                      : selected.kind === "collection"
                        ? "In collection"
                        : selected.kind === "discovery"
                          ? "Discovery"
                          : "Reference"}
                </span>
                <X
                  size={14}
                  style={{ cursor: "pointer", color: "#7C8AA3" }}
                  onClick={() => {
                    setSelected(null);
                    setHighlightId(null);
                  }}
                />
              </div>
              <button
                onClick={() => toggleNodeHidden(selected.id)}
                style={{ ...btnStyle(), marginTop: 10, width: "100%", justifyContent: "center" }}
                title={
                  hiddenNodeIdsRef.current.has(selected.id)
                    ? "Show this paper and its connections on the map again"
                    : "Hide this paper and its connections from the map"
                }
              >
                {hiddenNodeIdsRef.current.has(selected.id) ? (
                  <>
                    <Eye size={14} /> Show on map
                  </>
                ) : (
                  <>
                    <EyeOff size={14} /> Hide from map
                  </>
                )}
              </button>
              <div style={{ marginTop: 6, fontFamily: "Georgia, serif", lineHeight: 1.4 }}>{selected.label}</div>
              <div style={{ marginTop: 8, color: "#7C8AA3", fontSize: 12 }}>
                {selected.year} · {selected.cited_by_count} citations
                {(selected.kind === "collection" || selected.kind === "discovery") && (
                  <> · {selected.internalDegree || 0} network links</>
                )}
              </div>

              {(selected.authorships || []).length > 0 && (
                <div style={{ marginTop: 8, color: "#9AA8C0", fontSize: 11, lineHeight: 1.4 }}>
                  {(selected.authorships || [])
                    .slice(0, 8)
                    .map((a) => a.author?.display_name)
                    .filter(Boolean)
                    .join(", ")}
                  {(selected.authorships || []).length > 8 ? "…" : ""}
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#7C8AA3", textTransform: "uppercase", marginBottom: 6 }}>
                  Tag
                </div>
                <select
                  value={selected.tagId || ""}
                  onChange={(e) => assignTagToSelected(e.target.value || null)}
                  style={{ ...inputStyle(), width: "100%", cursor: "pointer" }}
                >
                  <option value="">No tag</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {tags.length === 0 && (
                  <div style={{ marginTop: 6, color: "#7C8AA3", fontSize: 11 }}>
                    Create tags via the Tags button above.
                  </div>
                )}
                {selected.tagId && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9AA8C0" }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: tags.find((t) => t.id === selected.tagId)?.color || DEFAULT_NODE_COLOR,
                        display: "inline-block",
                      }}
                    />
                    {tags.find((t) => t.id === selected.tagId)?.name}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#7C8AA3", textTransform: "uppercase", marginBottom: 6 }}>
                  Abstract
                </div>
                {abstractLoading && selected.abstract == null ? (
                  <div style={{ color: "#7C8AA3", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Loader2 size={12} className="spin" /> Loading…
                  </div>
                ) : selected.abstract ? (
                  <p style={{ color: "#C8CDE0", fontSize: 12, lineHeight: 1.55, margin: 0 }}>{selected.abstract}</p>
                ) : (
                  <p style={{ color: "#7C8AA3", fontSize: 12, margin: 0 }}>No abstract available.</p>
                )}
              </div>

              {mapMode !== "collection" && (
                <button onClick={() => expandNode(selected)} style={{ ...btnStyle(), marginTop: 14, width: "100%", justifyContent: "center" }}>
                  Expand network
                </button>
              )}

              {viewMode === "list" && (
                <button
                  onClick={() => showNodeOnMap(selected)}
                  style={{ ...btnStyle(), marginTop: 14, width: "100%", justifyContent: "center" }}
                >
                  <MapIcon size={14} /> Show on map
                </button>
              )}

              {selected.doi && zoteroDoisRef.current.has(selected.doi.toLowerCase()) ? (
                <div style={{ ...btnStyle(), marginTop: 8, width: "100%", justifyContent: "center", background: "#1f3a30", borderColor: "#2f5a45", cursor: "default" }}>
                  <Check size={14} /> Already in Zotero
                </div>
              ) : (
                <button onClick={() => addToZotero(selected)} style={{ ...btnStyle(), marginTop: 8, width: "100%", justifyContent: "center" }}>
                  {addingId === selected.id ? <Loader2 size={14} className="spin" /> : (<><Plus size={14} /> Add to Zotero</>)}
                </button>
              )}

              <a
                href={`https://openalex.org/${selected.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#7C8AA3", fontSize: 12, textDecoration: "none" }}
              >
                <ExternalLink size={12} /> View on OpenAlex
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
