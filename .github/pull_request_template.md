## Submission Type

- [ ] **Decision Tree** — research trajectory extracted via `/extract-knowhow` or web prompt
- [ ] **Skill** — manually written skill file

---

### For Decision Tree submissions:

- [ ] JSON file is placed in the correct location
- [ ] Tree is de-identified (no personal names, file paths, private URLs)
- [ ] Anchor is specified (paper URL/DOI or project description)
- [ ] All nodes have valid action types (20 core types or `other`)
- [ ] I have reviewed the tree for accuracy

### For Skill submissions:

**Domain:** <!-- e.g. physics / quantum-physics -->
**Skill name:** <!-- value of the `name` frontmatter field -->

- [ ] File is placed in the correct `skills/<domain>/<subdomain>/` folder
- [ ] Filename is lowercase and hyphen-separated
- [ ] All **required** frontmatter fields are filled in (`name`, `description`, `domain`, `author`, `expertise_level`, `status: draft`)
- [ ] All **required** body sections are present: Purpose, Domain Knowledge, Reasoning Protocol, Common Pitfalls
- [ ] `python utils/tools/validate.py <path-to-skill>` passes locally
- [ ] I am a domain expert in this area (or have collaborated with one)

### Summary
<!-- Brief description of what this submission covers -->

### Notes for reviewer
<!-- Anything the reviewer should pay special attention to -->
