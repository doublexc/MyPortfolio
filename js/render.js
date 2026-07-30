"use strict";

/* ==========================================================
    Portfolio Renderer
    Version 1.1 (Multi-Element & Auto-Hide Fixes)
========================================================== */

let CONFIG = {};

/* ==========================================================
    DOM Utilities
========================================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const byId = (id) => document.getElementById(id);
const exists = (id) => byId(id) !== null;

// 1. อ่าน Key จาก URL
const urlParams = new URLSearchParams(window.location.search);
let userKey = urlParams.get("key");

// 2. ถ้ามี Key ให้เก็บลง sessionStorage แต่ถ้าไม่มีให้ดึงค่าเดิมที่เคยเก็บไว้
if (userKey) {
  sessionStorage.setItem("portfolio_key", userKey);
} else {
  userKey = sessionStorage.getItem("portfolio_key") || "";
}

/* ==========================================================
    JSON Loading (Cloudflare Worker Integration)
========================================================== */

async function loadConfig() {
    // 1. ใส่ URL ของ Cloudflare Worker ของคุณ
    const WORKER_URL = "https://portfolio-api.xxxcopyxx.workers.dev/"; // ⚠️ เปลี่ยนเป็น URL Worker จริงของคุณ

    // 2. ดึงข้อมูลจาก Worker API โดยส่ง userKey ที่บันทึกไว้
    const response = await fetch(`${WORKER_URL}?key=${encodeURIComponent(userKey)}`);
    if(!response.ok){
        throw new Error(`Cannot load config from Worker API (${response.status})`);
    }
    
    CONFIG = await response.json();
}

/* ==========================================================
    Utility Helpers
========================================================== */

function create(tag, className=""){
    const element = document.createElement(tag);
    if(className){
        element.className = className;
    }
    return element;
}

function clear(element){
    if(element){
        element.innerHTML = "";
    }
}

function textAll(selector, value=""){
    $$(selector).forEach(el => {
        el.textContent = value;
    });
}

function htmlAll(selector, value=""){
    $$(selector).forEach(el => {
        el.innerHTML = value;
    });
}

function imageAll(selector, value=""){
    $$(selector).forEach(el => {
        if(value){
            el.src = value;
        }
    });
}

function linkAll(selector, url="", label=""){
    $$(selector).forEach(el => {
        if(!url){
            return;
        }
        
        // 🟢 เพิ่มการแนบ ?key=... ต่อท้ายปุ่ม Portfolio / PDF เพื่อไม่ให้ข้อมูลหลุดล็อก
        let finalUrl = url;
        if (selector.includes("portfolio") && userKey) {
            const hasParams = finalUrl.includes("?");
            finalUrl = `${finalUrl}${hasParams ? "&" : "?"}key=${encodeURIComponent(userKey)}`;
        }

        el.href = finalUrl;
        if(label){
            el.textContent = label;
        } else if(!el.textContent.trim()){
            el.textContent = finalUrl;
        }
    });
}

function empty(value, fallback="-"){
    if(value === undefined) return fallback;
    if(value === null) return fallback;
    if(value === "") return fallback;
    return value;
}

function createTag(name){
    return `<span class="tag">${name}</span>`;
}

function createTags(tags=[]){
    return tags.map(createTag).join("");
}

function createList(list=[]){
    if(!list || list.length === 0) return "";
    return `
        <ul>
            ${list.map(item=>`<li>${item}</li>`).join("")}
        </ul>
    `;
}

/* ==========================================================
    Generic Section Renderer
========================================================== */

function renderSection(id, data, builder){
    if(!exists(id)) return;
    const container = byId(id);
    clear(container);
    if(!Array.isArray(data)) return;
    data.forEach(item => {
        container.appendChild(builder(item));
    });
}

/* ==========================================================
    Visibility & Settings (Smart Auto-Hide)
========================================================== */

function visible(id, show){
    const element = document.getElementById(id);
    if(!element) return;
    element.style.display = show ? "" : "none";
}

function applySettings(){
    const s = CONFIG.settings || {};

    const toggleByClass = (className, isVisible) => {
        if (isVisible === undefined) return;
        document.querySelectorAll('.' + className).forEach(el => {
            const tr = el.closest('tr');
            if (tr) {
                tr.style.display = isVisible ? "" : "none";
            } else {
                const parentBox = el.closest('p, div');
                if (parentBox && parentBox.children.length <= 2) {
                    parentBox.style.display = isVisible ? "" : "none";
                } else {
                    el.style.display = isVisible ? "" : "none";
                }
            }
        });
    };

    toggleByClass("birthday", s.showBirthday);
    toggleByClass("religion", s.showReligion);
    toggleByClass("address", s.showAddress);
    toggleByClass("phone", s.showPhone);

    visible("birthdaySection", s.showBirthday);
    visible("religionSection", s.showReligion);
    visible("objectiveSection", s.showObjective);
    visible("certificatesSection", s.showCertificates);
    visible("awardsSection", s.showAwards);
    visible("activitiesSection", s.showActivities);
    visible("referencesSection", s.showReferences);
}

/* ==========================================================
    Card Builders
========================================================== */

function educationCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.university)}</h3>
        <p><strong>${empty(item.degree)}</strong> ${item.major ? `- ${item.major}` : ""}</p>
        <p>${empty(item.faculty)}</p>
        <p>${empty(item.start)} - ${empty(item.end)}</p>
        ${CONFIG.settings?.showGPA && item.gpa ? `<p>GPA: ${item.gpa}</p>` : ""}
        ${item.description ? `<p>${item.description}</p>` : ""}
    `;
    return card;
}

function experienceCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.position)}</h3>
        <strong>${empty(item.company)}</strong>
        <p>${empty(item.location)}</p>
        <p>${empty(item.start)} - ${item.working ? "Present" : empty(item.end)}</p>
        ${createList(item.details)}
        <div class="tags">
            ${createTags(item.technologies)}
        </div>
    `;
    return card;
}

function skillCard(group){
    const card = create("div", "card");
    let skillsHTML = `<h3>${empty(group.category)}</h3>`;
    (group.items || []).forEach(skill => {
        skillsHTML += `
            <div class="skill">
                <div class="skill-header">
                    <span>${skill.name}</span>
                    ${CONFIG.settings?.showSkillLevel ? `<span>${skill.level}%</span>` : ""}
                </div>
                <div class="skill-bar">
                    <div class="skill-fill" style="width:${skill.level}%"></div>
                </div>
            </div>
        `;
    });
    card.innerHTML = skillsHTML;
    return card;
}

function projectCard(project){
    const card = create("div", "card");
    card.innerHTML = `
        ${project.thumbnail ? `<img loading="lazy" src="${project.thumbnail}" alt="${project.name}">` : ""}
        <h3>${empty(project.name)}</h3>
        <p>${empty(project.subtitle, "")}</p>
        <p>${empty(project.description)}</p>
        <div class="tags">
            ${createTags(project.technologies)}
        </div>
        <div class="button-group">
            ${project.github ? `<a class="btn btn-primary" href="${project.github}" target="_blank">GitHub</a>` : ""}
            ${project.demo ? `<a class="btn btn-outline" href="${project.demo}" target="_blank">Demo</a>` : ""}
        </div>
    `;
    return card;
}

function languageCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.name)}</h3>
        <p>${empty(item.level)}</p>
    `;
    return card;
}

function certificateCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.name)}</h3>
        <p>${empty(item.organization)}</p>
        <p>${empty(item.year)}</p>
        ${item.url ? `<a href="${item.url}" target="_blank">Certificate Link</a>` : ""}
    `;
    return card;
}

function awardCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.name)}</h3>
        <p>${empty(item.organization)} (${empty(item.year)})</p>
        <p>${empty(item.description, "")}</p>
    `;
    return card;
}

function activityCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.name)}</h3>
        <p>${empty(item.organization)} (${empty(item.year)})</p>
        <p>${empty(item.description, "")}</p>
    `;
    return card;
}

function referenceCard(item){
    const card = create("div", "card");
    card.innerHTML = `
        <h3>${empty(item.name)}</h3>
        <p>${empty(item.position)} - ${empty(item.company)}</p>
        <p>Email: ${empty(item.email)}</p>
        <p>Phone: ${empty(item.phone)}</p>
    `;
    return card;
}

/* ==========================================================
    Render Profile
========================================================== */

function renderProfile(){
    const p = CONFIG.profile || {};

    const fullNameTH = `${empty(p.firstNameTH, "")} ${empty(p.lastNameTH, "")}`.trim();
    const fullNameEN = `${empty(p.firstNameEN, "")} ${empty(p.lastNameEN, "")}`.trim();

    textAll("#nameTH, .nameTH", fullNameTH);
    textAll("#nameEN, .nameEN", fullNameEN);
    textAll("#nickname, .nickname", empty(p.nickname, ""));
    textAll("#jobTitle, .jobTitle", empty(p.title));
    textAll("#summary, .summary", empty(p.summary, ""));
    textAll("#objective, .objective", empty(p.objective, ""));
    textAll("#birthday, .birthday", empty(p.birthday));
    textAll("#gender, .gender", empty(p.gender));
    textAll("#nationality, .nationality", empty(p.nationality));
    textAll("#religion, .religion", empty(p.religion));
    textAll("#address, .address", empty(p.address));
    textAll("#district, .district", empty(p.district));
    textAll("#province, .province", empty(p.province));
    textAll("#country, .country", empty(p.country));
    textAll("#zipcode, .zipcode", empty(p.zipcode));
    textAll("#email, .email", empty(p.email));
    textAll("#phone, .phone", empty(p.phone));

    imageAll("#profilePhoto, .profilePhoto", p.photo || "");

    linkAll("#github, .github", p.github || "");
    linkAll("#website, .website", p.website || "");
    linkAll("#portfolio, .portfolio", p.portfolio || "");
    linkAll("#linkedin, .linkedin", p.linkedin || "");
}

/* ==========================================================
    Render Social
========================================================== */

function renderSocial(){
    const social = CONFIG.social || {};

    Object.entries(social).forEach(([key, value]) => {
        linkAll(`#${key}, .social-${key}`, value);
    });
}

/* ==========================================================
    Render Interests
========================================================== */

function renderInterests(){
    if(!exists("interests")) return;
    htmlAll("#interests", (CONFIG.interests || []).map(createTag).join(""));
}

/* ==========================================================
    SEO
========================================================== */

function applySEO(){
    if(!CONFIG.seo) return;
    if(CONFIG.seo.title) document.title = CONFIG.seo.title;
    const desc = document.querySelector('meta[name="description"]');
    if(desc && CONFIG.seo.description){
        desc.setAttribute("content", CONFIG.seo.description);
    }
}

/* ==========================================================
    Resume & Portfolio Project Getters
========================================================== */

function getFeaturedProjects(){
    const projects = CONFIG.projects || [];
    const limit = CONFIG.resume?.featuredProjects ?? projects.length;
    return projects.filter(project => project.featured).slice(0, limit);
}

function renderResumeProjects(){
    if(!exists("resumeProjects")) return;
    renderSection("resumeProjects", getFeaturedProjects(), projectCard);
}

function getPortfolioProjects(){
    const projects = CONFIG.projects || [];
    if(CONFIG.portfolio?.showAllProjects) return projects;
    return projects.filter(project => project.featured);
}

function renderPortfolioProjects(){
    if(!exists("portfolioProjects")) return;
    renderSection("portfolioProjects", getPortfolioProjects(), projectCard);
}

/* ==========================================================
    Auto Hide Empty Sections
========================================================== */

function autoHideSections(){
    document.querySelectorAll("[data-section]").forEach(section => {
        const container = section.querySelector(".grid, .tags");
        if(container && container.children.length === 0){
            section.style.display = "none";
        }
    });
}

/* ==========================================================
    Meta
========================================================== */

function applyMeta(){
    if(!CONFIG.meta) return;
    document.documentElement.lang = CONFIG.meta.language || "th";
}

/* ==========================================================
    Main Render
========================================================== */

function render(){
    applyMeta();
    applySEO();
    applySettings();
    renderProfile();

    renderSection("education", CONFIG.education || [], educationCard);
    renderSection("experience", CONFIG.experience || [], experienceCard);
    renderSection("skills", CONFIG.skills || [], skillCard);
    renderSection("projects", CONFIG.projects || [], projectCard);
    renderSection("languages", CONFIG.languages || [], languageCard);
    renderSection("certificates", CONFIG.certificates || [], certificateCard);
    renderSection("awards", CONFIG.awards || [], awardCard);
    renderSection("activities", CONFIG.activities || [], activityCard);
    renderSection("references", CONFIG.references || [], referenceCard);

    renderResumeProjects();
    renderPortfolioProjects();
    renderInterests();
    renderSocial();

    autoHideSections();
}

/* ==========================================================
    Initialization
========================================================== */

async function init(){
    try{
        await loadConfig();
        render();
        console.log("Portfolio Ready");
    } catch(error){
        console.error(error);
        document.body.innerHTML = `
            <main class="error">
                <h1>Portfolio Error</h1>
                <p>${error.message}</p>
            </main>
        `;
    }
}

document.addEventListener("DOMContentLoaded", init);

/* ==========================================================
    Back to Top Button Functionality
========================================================== */

function initBackToTop() {
    const backToTopBtn = document.getElementById("backToTop");
    if (!backToTopBtn) return;

    // ตรวจสอบการเลื่อนหน้าจอเพื่อเปิด/ปิดการแสดงผลปุ่ม
    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            backToTopBtn.style.display = "block";
        } else {
            backToTopBtn.style.display = "none";
        }
    });

    // เมื่อกดปุ่ม ให้เลื่อนขึ้นด้านบนแบบนุ่มนวล
    backToTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

// เรียกใช้งานเมื่อโหลด DOM เสร็จสิ้น
document.addEventListener("DOMContentLoaded", initBackToTop);
