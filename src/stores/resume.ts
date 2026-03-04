import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'

export interface BasicInfo {
  name: string
  phone: string
  email: string
  age: string
  gender: string
  location: string
  jobTitle: string
  educationLevel: string
  avatar: string
  workYears: string
  currentStatus: string
  expectedLocation: string
  expectedSalary: string
  website: string
  wechat: string
  currentCity: string
  github: string
}

export interface EducationEntry {
  id: string
  school: string
  college: string
  major: string
  degree: string
  startDate: string
  endDate: string
  gpa: string
  description: string
  type: string
  location: string
}

export interface WorkEntry {
  id: string
  company: string
  department: string
  position: string
  startDate: string
  endDate: string
  location: string
  description: string
}

export interface ProjectEntry {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  link: string
  introduction: string
  mainWork: string
}

export interface AwardEntry {
  id: string
  name: string
  date: string
  description: string
}

export interface ModuleConfig {
  key: string
  label: string
  icon: string
  visible: boolean
}

let _idCounter = 0
function genId(): string {
  return `item_${Date.now()}_${++_idCounter}`
}

export const useResumeStore = defineStore('resume', () => {
  // Module visibility
  const modules = reactive<ModuleConfig[]>([
    { key: 'basicInfo', label: '基本信息', icon: '👤', visible: true },
    { key: 'education', label: '教育经历', icon: '🎓', visible: true },
    { key: 'skills', label: '专业技能', icon: '⚡', visible: true },
    { key: 'workExperience', label: '工作经历', icon: '💼', visible: true },
    { key: 'projectExperience', label: '项目经历', icon: '📁', visible: true },
    { key: 'awards', label: '荣誉奖项', icon: '🏆', visible: false },
    { key: 'selfIntro', label: '个人简介', icon: '📝', visible: false },
  ])

  // Basic Info
  const basicInfo = reactive<BasicInfo>({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    location: '',
    jobTitle: '',
    educationLevel: '',
    avatar: '',
    workYears: '',
    currentStatus: '',
    expectedLocation: '',
    expectedSalary: '',
    website: '',
    wechat: '',
    currentCity: '',
    github: '',
  })

  // Education
  const educationList = reactive<EducationEntry[]>([
    {
      id: genId(),
      school: '',
      college: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
      type: '',
      location: '',
    },
  ])

  // Skills
  const skills = ref('')

  // Work Experience
  const workList = reactive<WorkEntry[]>([
    {
      id: genId(),
      company: '',
      department: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    },
  ])

  // Project Experience
  const projectList = reactive<ProjectEntry[]>([
    {
      id: genId(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      introduction: '',
      mainWork: '',
    },
  ])

  // Awards
  const awardList = reactive<AwardEntry[]>([])

  // Self Intro
  const selfIntro = ref('')

  // Actions
  function toggleModule(key: string) {
    const mod = modules.find((m) => m.key === key)
    if (mod) mod.visible = !mod.visible
  }

  function isModuleVisible(key: string): boolean {
    const mod = modules.find((m) => m.key === key)
    return mod ? mod.visible : false
  }

  function addEducation() {
    educationList.push({
      id: genId(),
      school: '',
      college: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
      type: '',
      location: '',
    })
  }

  function removeEducation(id: string) {
    const idx = educationList.findIndex((e) => e.id === id)
    if (idx > -1) educationList.splice(idx, 1)
  }

  function addWork() {
    workList.push({
      id: genId(),
      company: '',
      department: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    })
  }

  function removeWork(id: string) {
    const idx = workList.findIndex((e) => e.id === id)
    if (idx > -1) workList.splice(idx, 1)
  }

  function addProject() {
    projectList.push({
      id: genId(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      introduction: '',
      mainWork: '',
    })
  }

  function removeProject(id: string) {
    const idx = projectList.findIndex((e) => e.id === id)
    if (idx > -1) projectList.splice(idx, 1)
  }

  function addAward() {
    awardList.push({
      id: genId(),
      name: '',
      date: '',
      description: '',
    })
  }

  function removeAward(id: string) {
    const idx = awardList.findIndex((e) => e.id === id)
    if (idx > -1) awardList.splice(idx, 1)
  }

  // --- LocalStorage persistence ---
  const STORAGE_KEY = 'resume-builder-data'

  function saveToStorage() {
    const data = {
      modules: modules.map(m => ({ ...m })),
      basicInfo: { ...basicInfo },
      educationList: educationList.map(e => ({ ...e })),
      skills: skills.value,
      workList: workList.map(w => ({ ...w })),
      projectList: projectList.map(p => ({ ...p })),
      awardList: awardList.map(a => ({ ...a })),
      selfIntro: selfIntro.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data.modules) {
        data.modules.forEach((m: ModuleConfig, i: number) => {
          if (modules[i]) Object.assign(modules[i], m)
        })
      }
      if (data.basicInfo) Object.assign(basicInfo, data.basicInfo)
      if (data.educationList) {
        educationList.splice(0, educationList.length, ...data.educationList)
      }
      if (data.skills !== undefined) skills.value = data.skills
      if (data.workList) {
        workList.splice(0, workList.length, ...data.workList)
      }
      if (data.projectList) {
        projectList.splice(0, projectList.length, ...data.projectList)
      }
      if (data.awardList) {
        awardList.splice(0, awardList.length, ...data.awardList)
      }
      if (data.selfIntro !== undefined) selfIntro.value = data.selfIntro
    } catch (e) {
      console.warn('Failed to load resume data from localStorage', e)
    }
  }

  // Load saved data on init
  loadFromStorage()

  // Auto-save on any change (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    [() => JSON.stringify(basicInfo), () => JSON.stringify(educationList), skills, () => JSON.stringify(workList), () => JSON.stringify(projectList), () => JSON.stringify(awardList), selfIntro, () => JSON.stringify(modules)],
    () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => saveToStorage(), 500)
    },
    { deep: true }
  )

  return {
    modules,
    basicInfo,
    educationList,
    skills,
    workList,
    projectList,
    awardList,
    selfIntro,
    toggleModule,
    isModuleVisible,
    addEducation,
    removeEducation,
    addWork,
    removeWork,
    addProject,
    removeProject,
    addAward,
    removeAward,
    saveToStorage,
  }
})
