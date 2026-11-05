from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "scripts" / "validate-project-memory"


class FrontendModuleRootTests(unittest.TestCase):
    def run_validator(self, project: Path) -> list[dict[str, object]]:
        result = subprocess.run(
            [str(VALIDATOR), str(project), "--json"],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertTrue(result.stdout, result.stderr)
        return json.loads(result.stdout)["findings"]

    @staticmethod
    def codes(findings: list[dict[str, object]]) -> set[str]:
        return {str(finding["code"]) for finding in findings}

    @staticmethod
    def write_frontend_doc(project: Path) -> None:
        docs = project / "docs"
        docs.mkdir(parents=True)
        (docs / "frontend.md").write_text(
            "# Frontend\n\n"
            "## Organización del frontend\n\n"
            "Estructura de prueba.\n\n"
            "### Revisión de módulos frontend\n\n"
            "Revisión de prueba.\n",
            encoding="utf-8",
        )

    def test_detects_nuxt_app_modules_as_positive_layout(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            module = project / "frontend" / "app" / "modules" / "documents"
            module.mkdir(parents=True)
            (module / "index.vue").write_text("x\n" * 301, encoding="utf-8")
            self.write_frontend_doc(project)

            findings = self.run_validator(project)

            self.assertIn("frontend-module-composition", self.codes(findings))

    def test_ignores_frontend_without_a_module_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            (project / "frontend" / "app" / "components").mkdir(parents=True)

            findings = self.run_validator(project)

            matching = [
                finding
                for finding in findings
                if finding["code"] == "frontend-module-structure"
            ]
            self.assertEqual("N/A", matching[0]["level"])

    def test_reports_conflicting_src_and_app_module_roots(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            (project / "frontend" / "src" / "modules").mkdir(parents=True)
            (project / "frontend" / "app" / "modules").mkdir(parents=True)
            self.write_frontend_doc(project)

            findings = self.run_validator(project)

            self.assertIn("frontend-module-root-conflict", self.codes(findings))

    def test_rejects_symlinked_module_root_as_adversarial_input(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory) / "project"
            external = Path(directory) / "external"
            (project / "frontend" / "app").mkdir(parents=True)
            external.mkdir()
            (project / "frontend" / "app" / "modules").symlink_to(
                external,
                target_is_directory=True,
            )

            findings = self.run_validator(project)

            matching = [
                finding
                for finding in findings
                if finding["code"] == "frontend-module-structure"
            ]
            self.assertEqual("N/A", matching[0]["level"])


if __name__ == "__main__":
    unittest.main()
