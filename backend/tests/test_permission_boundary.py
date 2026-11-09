import ast
from pathlib import Path


def test_aegis_package_strict_read_only_boundary():
    """Statically asserts that the AEGIS supervisor never imports administrative, broker, or write modules."""
    aegis_dir = Path(__file__).resolve().parent.parent / "aegis"
    assert aegis_dir.exists(), "AEGIS directory must exist"

    forbidden_modules = ["admin", "broker", "remediation", "backend.admin", "backend.broker"]

    for py_file in aegis_dir.glob("*.py"):
        with open(py_file, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source, filename=str(py_file))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    for forbidden in forbidden_modules:
                        assert forbidden not in alias.name, (
                            f"Violation in {py_file.name}: AEGIS module imports forbidden '{alias.name}'"
                        )
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    for forbidden in forbidden_modules:
                        assert forbidden not in node.module, (
                            f"Violation in {py_file.name}: AEGIS module imports from forbidden '{node.module}'"
                        )

        # Check that ReadOnlyStore contains no write methods for agent state or config
        if py_file.name == "store.py":
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    fn_name = node.name.lower()
                    assert not (
                        ("update" in fn_name and "agent" in fn_name)
                        or ("write" in fn_name and "agent" in fn_name)
                        or ("delete" in fn_name and "agent" in fn_name)
                    ), f"ReadOnlyStore exposes write method: {node.name}"
