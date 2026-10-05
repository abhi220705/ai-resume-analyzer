type SkillDefinition = {
  name: string;
  aliases: readonly string[];
};

const skillDictionary: readonly SkillDefinition[] = [
  { name: "Java", aliases: ["java"] },
  { name: "JavaScript", aliases: ["javascript", "java script"] },
  { name: "TypeScript", aliases: ["typescript"] },
  { name: "Python", aliases: ["python"] },
  { name: "C++", aliases: ["c++", "cpp"] },
  { name: "C#", aliases: ["c#", "c sharp", "csharp"] },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "SQL", aliases: ["sql"] },

  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", aliases: ["next.js", "nextjs"] },
  { name: "Angular", aliases: ["angular", "angularjs"] },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
  { name: "Express", aliases: ["express", "express.js", "expressjs"] },
  { name: "Spring Boot", aliases: ["spring boot", "springboot"] },
  { name: "Django", aliases: ["django"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },

  { name: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { name: "MySQL", aliases: ["mysql"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo db"] },
  { name: "Redis", aliases: ["redis"] },
  { name: "Prisma", aliases: ["prisma"] },

  { name: "Git", aliases: ["git"] },
  { name: "GitHub", aliases: ["github"] },
  { name: "Docker", aliases: ["docker"] },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Linux", aliases: ["linux"] },
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Azure", aliases: ["azure"] },
  { name: "Google Cloud", aliases: ["google cloud", "gcp"] },
  { name: "CI/CD", aliases: ["ci/cd", "ci / cd", "continuous integration"] },
  { name: "REST API", aliases: ["rest api", "rest apis", "restful"] },
  { name: "GraphQL", aliases: ["graphql"] },

  { name: "Jest", aliases: ["jest"] },
  { name: "Playwright", aliases: ["playwright"] },
  { name: "JUnit", aliases: ["junit"] },
  { name: "Selenium", aliases: ["selenium"] },

  { name: "Pandas", aliases: ["pandas"] },
  { name: "NumPy", aliases: ["numpy"] },
  { name: "Scikit-learn", aliases: ["scikit-learn", "scikit learn", "sklearn"] },
  { name: "TensorFlow", aliases: ["tensorflow"] },
  { name: "PyTorch", aliases: ["pytorch"] },
  { name: "Machine Learning", aliases: ["machine learning"] },
  { name: "Data Structures", aliases: ["data structures"] },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const skillMatchers = skillDictionary.map((skill) => ({
  name: skill.name,
  patterns: skill.aliases.map((alias) => {
    const escaped = escapeRegExp(alias).replace(/\s+/g, "\\s+");

    // Prevent partial matches inside another word or technology name.
    // Including + and # keeps punctuation-based names distinct.
    return new RegExp(
      `(?:^|[^\\p{L}\\p{N}_+#])${escaped}(?=$|[^\\p{L}\\p{N}_+#])`,
      "iu",
    );
  }),
}));

export function detectResumeSkills(text: string): string[] {
  const normalized = text.normalize("NFKC");

  return skillMatchers
    .filter((skill) =>
      skill.patterns.some((pattern) => pattern.test(normalized)),
    )
    .map((skill) => skill.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}