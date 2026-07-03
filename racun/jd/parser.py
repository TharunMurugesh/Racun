import re
from pathlib import Path
from typing import List, Dict, Any


class JDParser:

    MANDATORY_SECTION_PATTERNS = [
        r"must.have",
        r"required",
        r"mandatory",
        r"requirements",
        r"qualifications",
        r"you.must",
        r"minimum",
    ]

    OPTIONAL_SECTION_PATTERNS = [
        r"nice.to.have",
        r"preferred",
        r"bonus",
        r"optional",
        r"plus",
        r"desired",
        r"good.to.have",
    ]

    def parse(self, jd_path: str) -> List[Dict[str, Any]]:
        content = Path(jd_path).read_text(encoding="utf-8")
        sections = self._split_into_sections(content)
        requirements = []

        for section_title, section_body, is_mandatory in sections:
            items = self._extract_list_items(section_body)
            for item in items:
                if len(item.strip()) < 10:
                    continue
                requirements.append({
                    "text": item.strip(),
                    "is_mandatory": is_mandatory,
                    "section": section_title.strip(),
                })

        if not requirements:
            requirements = self._fallback_extraction(content)

        return requirements

    def _split_into_sections(self, content: str):
        lines = content.split("\n")
        sections = []
        current_title = "General"
        current_body = []
        current_mandatory = True

        for line in lines:
            if self._is_heading(line):
                if current_body:
                    sections.append((current_title, "\n".join(current_body), current_mandatory))
                current_title = line.strip("# ").strip()
                current_body = []
                current_mandatory = self._classify_section(current_title)
            else:
                current_body.append(line)

        if current_body:
            sections.append((current_title, "\n".join(current_body), current_mandatory))

        return sections

    def _is_heading(self, line: str) -> bool:
        return bool(re.match(r"^#{1,4}\s+\S", line))

    def _classify_section(self, title: str) -> bool:
        title_lower = title.lower()
        for pattern in self.OPTIONAL_SECTION_PATTERNS:
            if re.search(pattern, title_lower):
                return False
        for pattern in self.MANDATORY_SECTION_PATTERNS:
            if re.search(pattern, title_lower):
                return True
        return True

    def _extract_list_items(self, text: str) -> List[str]:
        items = []
        for line in text.split("\n"):
            stripped = line.strip()
            if stripped.startswith(("-", "*", "+")):
                item = stripped[1:].strip()
                if item:
                    items.append(item)
            elif re.match(r"^\d+\.\s+", stripped):
                item = re.sub(r"^\d+\.\s+", "", stripped)
                if item:
                    items.append(item)
        return items

    def _fallback_extraction(self, content: str) -> List[Dict[str, Any]]:
        items = self._extract_list_items(content)
        return [
            {"text": item.strip(), "is_mandatory": True, "section": "General"}
            for item in items
            if len(item.strip()) >= 10
        ]
