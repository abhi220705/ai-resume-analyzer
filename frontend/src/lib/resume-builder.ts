export type ResumePersonalDetails = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
};

export type ResumeEducation = {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  currentlyStudying: boolean;
  grade: string;
  details: string;
};

export type ResumeExperience = {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  bullets: string[];
};

export type ResumeProject = {
  id: string;
  name: string;
  role: string;
  technologies: string[];
  link: string;
  bullets: string[];
};

export type ResumeAchievement = {
  id: string;
  title: string;
  organization: string;
  date: string;
  details: string;
};

export type ResumeSkillGroup = {
  id: string;
  category: string;
  skills: string[];
};

export type ResumePhoto = {
  // Reference to a stored photo, not its image bytes.
  storageKey: string | null;
  showOnResume: boolean;
};

export type ResumeBuilderData = {
  schemaVersion: 1;
  title: string;
  template: "classic";
  personal: ResumePersonalDetails;
  photo: ResumePhoto;
  education: ResumeEducation[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skillGroups: ResumeSkillGroup[];
  achievements: ResumeAchievement[];
};

export function createEmptyResume(
  fullName = "",
  email = "",
): ResumeBuilderData {
  return {
    schemaVersion: 1,
    title: "Untitled resume",
    template: "classic",
    personal: {
      fullName,
      headline: "",
      email,
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      summary: "",
    },
    photo: {
      storageKey: null,
      showOnResume: false,
    },
    education: [],
    experience: [],
    projects: [],
    skillGroups: [],
    achievements: [],
  };
}