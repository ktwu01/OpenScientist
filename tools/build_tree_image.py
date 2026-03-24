#!/usr/bin/env python3
"""
Scan skills/ folder structure, draw a knowledge-tree PNG, save to
assets/knowledge-tree.png, and update the diagram in readme.md.

Requirements: pip install matplotlib
Usage:        python tools/build_tree_image.py
"""

import re
import math
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

# ── paths ────────────────────────────────────────────────────────────────────
REPO_ROOT  = Path(__file__).parent.parent
SKILLS_DIR = REPO_ROOT / "skills"
ASSETS_DIR = REPO_ROOT / "assets"
OUTPUT_PNG = ASSETS_DIR / "knowledge-tree.png"
README     = REPO_ROOT / "readme.md"

# ── domain metadata ──────────────────────────────────────────────────────────
DOMAIN_EMOJI = {
    "physics":          "⚛",
    "biology":          "◉",
    "chemistry":        "⚗",
    "mathematics":      "∑",
    "neuroscience":     "◈",
    "computer-science": "⌨",
    "cross-domain":     "∞",
}

NATURAL  = {"physics", "biology", "chemistry", "neuroscience"}
FORMAL   = {"mathematics", "computer-science"}

# ── colour palette ────────────────────────────────────────────────────────────
C = dict(
    bg        = "#F6F8FA",
    line      = "#ADC8E6",
    root_fill = "#0D2137",
    root_text = "#FFFFFF",
    group_fill= "#174D7A",
    group_text= "#FFFFFF",
    dom_fill  = "#2A7EC8",
    dom_text  = "#FFFFFF",
    sub_fill  = "#FFFFFF",
    sub_text  = "#1B3A6B",
    sub_edge  = "#ADC8E6",
)

# ── tree node ────────────────────────────────────────────────────────────────
class Node:
    def __init__(self, key: str, label: str, kind: str):
        self.key      = key
        self.label    = label
        self.kind     = kind          # root | group | domain | subdomain
        self.children: list["Node"] = []
        self.x = 0.0
        self.y = 0.0
        self._span = 0.0              # horizontal space allocated

# ── scan ──────────────────────────────────────────────────────────────────────
def scan() -> dict[str, list[str]]:
    tree: dict[str, list[str]] = {}
    for d in sorted(SKILLS_DIR.iterdir()):
        if d.is_dir() and not d.name.startswith("_"):
            tree[d.name] = sorted(
                s.name for s in d.iterdir()
                if s.is_dir() and not s.name.startswith("_")
            )
    return tree


def fmt(name: str) -> str:
    words = name.replace("-", " ").title().split()
    # line-break long labels
    if len(words) > 2:
        mid = math.ceil(len(words) / 2)
        return " ".join(words[:mid]) + "\n" + " ".join(words[mid:])
    return " ".join(words)


def build_tree(scan_data: dict[str, list[str]]) -> Node:
    root = Node("root", "OpenScientist", "root")

    nat_domains  = [d for d in scan_data if d in NATURAL]
    form_domains = [d for d in scan_data if d in FORMAL]
    other        = [d for d in scan_data if d not in NATURAL and d not in FORMAL]

    def add_domain(parent: Node, domain: str):
        e   = DOMAIN_EMOJI.get(domain, "·")
        n   = Node(domain, f"{e}  {fmt(domain)}", "domain")
        parent.children.append(n)
        for sub in scan_data.get(domain, []):
            n.children.append(Node(f"{domain}/{sub}", fmt(sub), "subdomain"))

    if nat_domains:
        nat = Node("natural", "Natural Sciences", "group")
        root.children.append(nat)
        for d in nat_domains:
            add_domain(nat, d)

    if form_domains:
        frm = Node("formal", "Formal Sciences", "group")
        root.children.append(frm)
        for d in form_domains:
            add_domain(frm, d)

    for d in other:
        add_domain(root, d)

    return root


# ── layout (Reingold-Tilford style, simplified) ───────────────────────────────
UNIT = 1.0   # base horizontal unit per leaf

def compute_span(node: Node) -> float:
    if not node.children:
        node._span = UNIT
    else:
        for c in node.children:
            compute_span(c)
        node._span = sum(c._span for c in node.children)
    return node._span


def assign_positions(node: Node, x_left: float, depth: int, y_step: float):
    node.y = -depth * y_step
    if not node.children:
        node.x = x_left + node._span / 2
        return
    cursor = x_left
    for c in node.children:
        assign_positions(c, cursor, depth + 1, y_step)
        cursor += c._span
    node.x = (x_left + cursor) / 2


# ── drawing ───────────────────────────────────────────────────────────────────
def node_style(kind: str) -> dict:
    if kind == "root":
        return dict(fc=C["root_fill"], ec=C["root_fill"], tc=C["root_text"],
                    bstyle="round,pad=0.35", fs=11, fw="bold", lw=0)
    if kind == "group":
        return dict(fc=C["group_fill"], ec=C["group_fill"], tc=C["group_text"],
                    bstyle="round,pad=0.3", fs=9.5, fw="bold", lw=0)
    if kind == "domain":
        return dict(fc=C["dom_fill"], ec=C["dom_fill"], tc=C["dom_text"],
                    bstyle="round,pad=0.28", fs=8.8, fw="semibold", lw=0)
    # subdomain
    return dict(fc=C["sub_fill"], ec=C["sub_edge"], tc=C["sub_text"],
                bstyle="round,pad=0.25", fs=8, fw="normal", lw=1.0)


def draw_node(ax, node: Node, x_scale: float, box_w: float):
    style = node_style(node.kind)
    x, y  = node.x * x_scale, node.y

    # box width adapts to label length but stays within bounds
    text_lines = node.label.split("\n")
    longest    = max(len(l) for l in text_lines)
    w = min(box_w, max(box_w * 0.55, longest * 0.072))
    h = 0.30 + 0.22 * (len(text_lines) - 1)

    box = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle=style["bstyle"],
        facecolor=style["fc"], edgecolor=style["ec"],
        linewidth=style["lw"], zorder=3,
    )
    ax.add_patch(box)
    ax.text(
        x, y, node.label,
        ha="center", va="center",
        color=style["tc"], fontsize=style["fs"],
        fontweight=style["fw"], zorder=4,
        linespacing=1.3,
    )
    return h / 2  # half-height for connector offset


def draw_tree(ax, node: Node, x_scale: float, box_w: float, parent_y_bottom=None):
    half_h = draw_node(ax, node, x_scale, box_w)
    nx, ny = node.x * x_scale, node.y

    if parent_y_bottom is not None:
        ax.plot(
            [nx, nx], [ny + half_h, parent_y_bottom],
            color=C["line"], lw=1.2, zorder=1,
        )

    if node.children:
        child_tops = [c.y - 0.15 for c in node.children]  # approx top of child
        xs = [c.x * x_scale for c in node.children]
        y_conn = ny - half_h - 0.12  # horizontal bus line

        # vertical stem from node down to bus
        ax.plot([nx, nx], [ny - half_h, y_conn], color=C["line"], lw=1.2, zorder=1)
        # horizontal bus
        ax.plot([min(xs), max(xs)], [y_conn, y_conn], color=C["line"], lw=1.2, zorder=1)

        for child in node.children:
            draw_tree(ax, child, x_scale, box_w, parent_y_bottom=y_conn)


# ── main ──────────────────────────────────────────────────────────────────────
def main():
    ASSETS_DIR.mkdir(exist_ok=True)

    scan_data = scan()
    root      = build_tree(scan_data)
    compute_span(root)

    # how many levels deep?
    def max_depth(n, d=0):
        return d if not n.children else max(max_depth(c, d+1) for c in n.children)
    depth   = max_depth(root)
    y_step  = 1.6
    x_scale = 1.8

    assign_positions(root, 0, 0, y_step)

    fig_w  = max(10, root._span * x_scale * 0.9)
    fig_h  = max(6,  (depth + 1) * y_step * 0.85 + 1.2)
    box_w  = min(1.6, fig_w / (root._span + 1))

    fig, ax = plt.subplots(figsize=(fig_w, fig_h))
    fig.patch.set_facecolor(C["bg"])
    ax.set_facecolor(C["bg"])
    ax.set_aspect("equal")
    ax.axis("off")

    draw_tree(ax, root, x_scale, box_w)

    # title
    ax.text(
        root.x * x_scale, root.y + 0.75,
        "OpenScientist — Knowledge Tree",
        ha="center", va="bottom",
        fontsize=13, color="#0D2137",
        fontweight="bold", alpha=0.55,
    )

    plt.tight_layout(pad=0.4)
    plt.savefig(OUTPUT_PNG, dpi=160, bbox_inches="tight",
                facecolor=C["bg"])
    plt.close()
    print(f"Saved: {OUTPUT_PNG}")

    # ── patch README ──────────────────────────────────────────────────────────
    text = README.read_text(encoding="utf-8")

    # Replace mermaid block if present
    mermaid_pattern = re.compile(r"```mermaid\ngraph TD.*?```\n?", re.DOTALL)
    img_tag = "![Knowledge Tree](assets/knowledge-tree.png)\n"

    if mermaid_pattern.search(text):
        new_text = mermaid_pattern.sub(img_tag, text, count=1)
    elif "![Knowledge Tree]" in text:
        new_text = re.sub(
            r"!\[Knowledge Tree\]\(assets/knowledge-tree\.png\)",
            img_tag.strip(), text,
        )
    else:
        print("Warning: no mermaid block or existing image tag found in README.")
        return

    README.write_text(new_text, encoding="utf-8")
    print(f"Updated: {README}")


if __name__ == "__main__":
    main()
