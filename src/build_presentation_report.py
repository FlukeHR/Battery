"""将每来源10个案例排版为中文展示报告与可分享PDF。"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

from src.config import PROJECT_ROOT


def main() -> None:
    import fitz
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    import numpy as np
    import pandas as pd
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.platypus import Paragraph, Table, TableStyle

    output = PROJECT_ROOT / "docs"
    assets = output / "presentation_assets"
    assets.mkdir(exist_ok=True)
    previews = PROJECT_ROOT / "tmp/pdfs/presentation_preview"
    previews.mkdir(parents=True, exist_ok=True)
    summary = json.loads((output / "多数据集案例摘要.json").read_text(encoding="utf-8"))
    cases = pd.read_csv(output / "多数据集案例明细.csv")
    assert len(cases) == 50 and cases.groupby("dataset").size().eq(10).all()
    assert not cases.duplicated(["dataset", "cell_id", "cycle_position"]).any()
    total_cases = len(cases)
    font_path = Path("C:/Windows/Fonts/msyh.ttc")
    bold_path = Path("C:/Windows/Fonts/msyhbd.ttc")
    pdfmetrics.registerFont(TTFont("YaHei", str(font_path), subfontIndex=0))
    pdfmetrics.registerFont(TTFont("YaHeiBold", str(bold_path), subfontIndex=0))
    pdfmetrics.registerFontFamily("YaHei", normal="YaHei", bold="YaHeiBold")
    font_manager.fontManager.addfont(str(font_path))
    plt.rcParams.update({"font.family": font_manager.FontProperties(fname=str(font_path)).get_name(),
                         "axes.unicode_minus": False, "font.size": 10, "axes.edgecolor": "#D6E1DD"})
    teal, cyan, ink, muted = "#137A63", "#72C5B1", "#18332D", "#6B817A"
    order = [item["dataset"] for item in summary["groups"]]
    means = cases.groupby("dataset")[["soh", "predicted_soh"]].mean().loc[order] * 100
    fig, ax = plt.subplots(figsize=(8.0, 2.7), layout="constrained")
    x = np.arange(5)
    ax.bar(x-.16, means.soh, width=.29, color=teal, label="实测 SOH")
    ax.bar(x+.16, means.predicted_soh, width=.29, color=cyan, label="预测 SOH")
    ax.set(xticks=x, xticklabels=order, ylim=(0, 112), ylabel="健康度 (%)")
    ax.set_yticks([0,25,50,75,100])
    ax.grid(axis="y", alpha=.16)
    ax.set_axisbelow(True)
    for spine in ["top","right"]:
        ax.spines[spine].set_visible(False)
    for index, item in enumerate(summary["groups"]):
        ax.text(index, 105, f"偏差 {item['soh_mae_pp']:.2f} 点", ha="center", color=teal, fontsize=9)
    ax.legend(loc="lower center", bbox_to_anchor=(.5,1.08), ncol=2, frameon=False)
    soh_plot = assets / "样例健康度对比.png"
    fig.savefig(soh_plot, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    life = cases[cases.dataset.isin(["HUST","MATR","SNL"])]
    life_count = len(life)
    page_count = len(order) + 2
    fig, ax = plt.subplots(figsize=(4.6, 3.4), layout="constrained")
    maximum = max(life.remaining_cycles.max(), life.predicted_remaining_cycles.max()) * 1.08
    line = np.linspace(0, maximum, 100)
    ax.fill_between(line, line*.9, line*1.1, color="#EDF6F2", label="±10% 参考区间")
    ax.plot(line, line, color="#72988B", linewidth=1.2)
    for source, color in zip(["HUST","MATR","SNL"],[teal,"#4C94BC","#C19A55"]):
        group = life[life.dataset == source]
        ax.scatter(group.remaining_cycles, group.predicted_remaining_cycles, color=color, s=48,
                   edgecolor="white", linewidth=.8, label=source, zorder=3)
    ax.set(xlim=(0,maximum), ylim=(0,maximum), xlabel="实测剩余循环数", ylabel="预测剩余循环数")
    ax.grid(alpha=.14)
    ax.legend(fontsize=8, frameon=False, loc="upper left")
    for spine in ["top","right"]:
        ax.spines[spine].set_visible(False)
    life_plot = assets / "样例剩余寿命对比.png"
    fig.savefig(life_plot, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    pdf_path = output / "电检通_多数据集案例报告_50题.pdf"
    canvas = Canvas(str(pdf_path), pagesize=A4, pageCompression=1)
    canvas.setTitle("电检通 - 多数据集案例报告")
    canvas.setAuthor("电检通项目组")
    width, height = A4
    margin = 46
    inner = width - margin*2

    def text(value, x, y, size=10, color=ink, bold=False):
        canvas.setFont("YaHeiBold" if bold else "YaHei", size)
        canvas.setFillColor(colors.HexColor(color))
        canvas.drawString(x, y, str(value))

    def para(value, x, top, available=inner, size=9.5, color=muted, leading=16):
        style = ParagraphStyle("body", fontName="YaHei", fontSize=size, leading=leading,
                               textColor=colors.HexColor(color), wordWrap="CJK")
        paragraph = Paragraph(escape(value), style)
        _, extent = paragraph.wrap(available, 1000)
        assert top-extent > 42, f"正文超出页脚：{value}"
        paragraph.drawOn(canvas, x, top-extent)
        return top-extent

    def header(page, chapter):
        text("BATTEST / 电检通",margin,height-35,9,teal,True)
        text(chapter,width-margin-138,height-35,8.2,muted)
        canvas.setStrokeColor(colors.HexColor("#DFEAE5"))
        canvas.line(margin,42,width-margin,42)
        text("V2 研究样例 · 多数据集案例报告",margin,25,7.5,muted)
        text(f"{page:02d} / {page_count:02d}",width-margin-40,25,8,muted)

    def title(kicker, heading, subtitle=""):
        text(kicker,margin,height-89,9,teal,True)
        text(heading,margin,height-128,27,ink,True)
        if subtitle:
            para(subtitle,margin,height-145,size=10.2)

    def table(rows, top, widths, font_size=9.5, row_height=27):
        value = Table(rows,colWidths=widths,rowHeights=[row_height]*len(rows))
        value.setStyle(TableStyle([
            ("FONTNAME",(0,0),(-1,-1),"YaHei"),("FONTSIZE",(0,0),(-1,-1),font_size),
            ("FONTNAME",(0,0),(-1,0),"YaHeiBold"),("TEXTCOLOR",(0,0),(-1,0),colors.HexColor(teal)),
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#EAF5F0")),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F7FAF9")]),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(1,0),(-1,-1),"CENTER"),
            ("TEXTCOLOR",(0,1),(-1,-1),colors.HexColor(ink)),
            ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
            ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("LINEBELOW",(0,0),(-1,0),.4,colors.HexColor("#CFE4DA")),
        ]))
        _, extent = value.wrap(inner,1000)
        assert top-extent > 55
        value.drawOn(canvas,margin,top-extent)
        return top-extent

    def source_heading(source, y, show_life=False):
        item = next(item for item in summary["groups"] if item["dataset"] == source)
        text(source,margin,y,17,teal,True)
        chemistry = "三元锂" if item["chemistry"] == "ncm" else "磷酸铁锂"
        caption = f"{chemistry} · {item['cases']}个样例 / {item['cells']}个电芯 · SOH平均偏差 {item['soh_mae_pp']:.2f} 点"
        if show_life:
            caption += f" · 寿命偏差 {item['rul_mape_percent']:.2f}%"
        text(caption,margin,y-23,8.7,muted)

    header(1,"样例概览 / CASE STUDY")
    title("多来源电池数据研究", "多数据集案例报告", "健康度 SOH 与剩余循环寿命 | V2 底层模型")
    text(f"5个数据集 · 每个来源10题 · 共{total_cases}个案例     {date.today().isoformat()}",margin,646,10,muted)
    card_width = (inner-16)/2
    for index, (value, unit, label) in enumerate([
        (f"{summary['soh_mae_pp']:.2f}","个百分点",f"本报告{total_cases}个案例的SOH平均绝对偏差"),
        (f"{summary['rul_mape_percent']:.2f}","%",f"{life_count}个可评分寿命案例的平均相对偏差")]):
        left = margin+index*(card_width+16)
        canvas.setFillColor(colors.HexColor("#EFF7F3"))
        canvas.roundRect(left,524,card_width,92,10,fill=1,stroke=0)
        text(value,left+16,565,31,teal,True)
        text(unit,left+112,569,11,teal)
        text(label,left+16,540,8.3,muted)
    text("真实健康度与预测结果",margin,492,13,ink,True)
    canvas.drawImage(str(soh_plot),margin,283,width=inner,height=195,preserveAspectRatio=True,anchor="c",mask="auto")
    rows = [["来源","样例 / 电芯","SOH偏差(点)","寿命偏差"]]
    for item in summary["groups"]:
        rows.append([item["dataset"],f"{item['cases']} / {item['cells']}",f"{item['soh_mae_pp']:.2f}",
                     f"{item['rul_mape_percent']:.2f}%" if item["rul_mape_percent"] is not None else "仅展示SOH"])
    table(rows,270,[100,115,145,inner-360],font_size=9,row_height=23)
    para(f"本报告展示5个数据集中的{total_cases}个案例，所有统计结果均按报告内案例计算。",margin,110,size=8.5,leading=14)
    canvas.showPage()

    for page, source in enumerate(order, start=2):
        item = next(item for item in summary["groups"] if item["dataset"] == source)
        has_life = item["rul_mape_percent"] is not None
        chemistry = "磷酸铁锂" if has_life else "三元锂"
        header(page, "健康度与寿命 / LFP" if has_life else "健康度样例 / NCM")
        title(f"{page-1:02d} / {chemistry}", "健康度与剩余寿命" if has_life else "健康度预测样例",
              f"{source} 数据集 · 10题结果对照 · 输入与输出均可按编号追溯。")
        source_heading(source, 650, has_life)
        if has_life:
            rows=[["样例","循环","实测SOH","预测SOH","实测余循环","预测余循环","寿命偏差"]]
            for row in cases[cases.dataset == source].itertuples():
                rows.append([row.case_id,str(int(row.cycle_position)),f"{row.soh*100:.2f}%",f"{row.predicted_soh*100:.2f}%",
                             f"{row.remaining_cycles:.0f}",f"{row.predicted_remaining_cycles:.0f}",f"{row.rul_relative_error*100:.2f}%"])
            end = table(rows, 606, [65,43,73,73,79,79,inner-412], font_size=9, row_height=29)
        else:
            rows=[["样例","循环位置","实测SOH","预测SOH","偏差(点)"]]
            for row in cases[cases.dataset == source].itertuples():
                rows.append([row.case_id,str(int(row.cycle_position)),f"{row.soh*100:.2f}%",f"{row.predicted_soh*100:.2f}%",f"{row.soh_error_pp:.3f}"])
            end = table(rows, 606, [88,72,110,110,inner-380], font_size=10, row_height=29)
        para(f"本页10题的健康度平均绝对偏差为 {item['soh_mae_pp']:.2f} 个百分点。", margin, end-20, size=10)
        if has_life:
            para(f"剩余寿命按循环数对照，本页平均相对偏差为 {item['rul_mape_percent']:.2f}%。", margin, end-48, size=10)
            notes = "寿命单位为剩余循环数，样例和对应电芯数量分别列于上方。实际剩余月份仍需结合使用频率换算。"
        else:
            notes = "三元锂当前缺少足够的实测80%寿命终点，本页仅评价健康度，不把规则推算当作寿命验证答案。"
        canvas.setFillColor(colors.HexColor("#EFF7F3"))
        canvas.roundRect(margin, 139, inner, 67, 9, fill=1, stroke=0)
        para(notes, margin+13, 192, available=inner-26, size=9.4, color=teal, leading=17)
        para("完整电芯标识、输入参数及接口响应可按样例编号在明细CSV中查阅。",margin,101,size=8.5)
        canvas.showPage()

    header(page_count,"测试口径 / NOTES")
    title("06 / 结果说明", "测试口径与配套资料", "记录各案例的输入参数、实测基准与模型输出。")
    canvas.drawImage(str(life_plot),margin,431,width=282,height=211,preserveAspectRatio=True,anchor="c",mask="auto")
    text(f"{life_count}个寿命样例",351,620,12,teal,True)
    top=para(f"这{life_count}个案例同时比较实测剩余循环与预测结果。浅色区域为±10%的参考范围。",351,599,available=198,size=9.5,leading=17)
    top=para("剩余循环与剩余月份是不同指标。本报告不把推算月份当作实测日历寿命。",351,top-19,available=198,size=9.5,leading=17)
    text("结果如何计算",margin,411,12,ink,True)
    para("健康度 SOH = 当前循环放电容量 / 首个有效循环放电容量。",margin,390,size=10)
    para("真实剩余循环 = 首次SOH达到80%的循环位置 - 当前循环位置。寿命相对偏差 = 预测与实测的差值绝对值 / 真实剩余循环。",margin,365,size=9.5)
    text("样例与输入",margin,305,12,ink,True)
    para("本次包含CALB、XJTU、HUST、MATR、SNL各10个案例。循环位置、电芯数量和逐题误差见结果表；有实测寿命终点的案例同时评价剩余循环数。",margin,284,size=9.3)
    para("输入依据为已知实验协议映射的固定使用场景。统计量仅针对本报告案例，实际车辆与日历寿命仍需实测校准。",margin,234,size=9.3)
    text("配套资料",margin,176,12,ink,True)
    para("多数据集案例明细.csv：各案例的电芯、循环、输入和预测响应。\n多数据集案例摘要.json：本报告的分来源统计结果。",margin,155,size=9.3,leading=17)
    para("模型版本：xgboost-v2。原始数据与训练二进制仅在本地保留，官网和小程序共用预测接口。",margin,91,size=8.4,leading=14)
    canvas.save()

    document=fitz.open(str(pdf_path))
    assert len(document)==page_count
    for index,page in enumerate(document):
        extracted=page.get_text()
        assert len(extracted)>180, f"第{index+1}页文字提取异常"
        page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).save(str(previews/f"page-{index+1}.png"))
    document.close()
    lines=["# 电检通：多数据集案例报告","", f"五个来源，每个来源10题，共{total_cases}个案例。", "",
           f"这{total_cases}题的SOH平均绝对偏差为 **{summary['soh_mae_pp']:.2f} 个百分点**；{life_count}个可评分寿命样例的平均相对偏差为 **{summary['rul_mape_percent']:.2f}%**。", "",
           "所有统计结果仅对应本报告内案例。", "",
           "[查看排版PDF](电检通_多数据集案例报告_50题.pdf)", "", "![健康度样例对照](presentation_assets/样例健康度对比.png)", "",
           "| 来源 | 类型 | 样例 / 电芯 | SOH平均偏差（点） | 寿命平均相对偏差 |", "|---|---|---:|---:|---:|"]
    for item in summary["groups"]:
        life_text=f"{item['rul_mape_percent']:.2f}%" if item["rul_mape_percent"] is not None else "无足够终点，仅展示SOH"
        lines.append(f"| {item['dataset']} | {'三元锂' if item['chemistry']=='ncm' else '磷酸铁锂'} | {item['cases']} / {item['cells']} | {item['soh_mae_pp']:.3f} | {life_text} |")
    for source in order:
        lines += ["", f"## {source}：10个案例", "", "| 样例 | 循环位置 | 实测SOH | 预测SOH | 偏差（点） | 实测 / 预测剩余循环 |", "|---|---:|---:|---:|---:|---|"]
        for row in cases[cases.dataset==source].itertuples():
            life_text=f"{row.remaining_cycles:.0f} / {row.predicted_remaining_cycles:.0f}" if source in {"HUST","MATR","SNL"} else "未评分"
            lines.append(f"| {row.case_id} | {int(row.cycle_position)} | {row.soh*100:.2f}% | {row.predicted_soh*100:.2f}% | {row.soh_error_pp:.3f} | {life_text} |")
    lines += ["", "## 测试口径", "",
              "SOH按当前放电容量与首个有效循环容量之比计算；真实剩余循环以首次SOH≤80%为终点。未观测终点不使用记录结束或外推寿命标签替代。",
              "输入采用已知实验协议映射的固定使用场景，循环位置和电芯数列于结果表。寿命使用接口直接返回的剩余循环数；实际车辆与剩余日历月份仍需实测校准。", "",
              "[50题明细](多数据集案例明细.csv) · [分来源统计](多数据集案例摘要.json)"]
    (output/"多数据集案例报告.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(f"Created {page_count}-page PDF, Markdown, charts and rendered QA pages: {pdf_path.stat().st_size} bytes",flush=True)


if __name__=="__main__":
    main()
