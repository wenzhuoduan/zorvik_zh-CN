//! 汉化 fork 自己的检查：中文课程表能加载，并且确实取到了中文文件。
//!
//! 放在独立的测试二进制里（不是单元测试），因为它会改进程级的语言开关；
//! 上游的测试因此仍然跑在英文课程上，不受影响。
use std::sync::atomic::{AtomicBool, Ordering};

static DONE: AtomicBool = AtomicBool::new(false);

fn chinese_course() -> &'static zorvik_academy::Course {
    if !DONE.swap(true, Ordering::SeqCst) {
        zorvik_academy::set_chinese(true);
    }
    zorvik_academy::course().expect("course.zh-CN 必须能通过校验")
}

#[test]
fn translated_units_load_and_are_chinese() {
    let course = chinese_course();
    let welcome = course.units.iter().find(|u| u.id == "welcome").expect("welcome unit");
    assert!(
        welcome.title.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c)),
        "第 0 单元应当有中文标题，实际是 {:?}",
        welcome.title
    );
}

#[test]
fn untranslated_units_fall_back_to_english() {
    let course = chinese_course();
    // 只翻译了部分单元：其余单元必须回退英文，而不是缺内容或报错。
    let english = course.units.iter().filter(|u| !u.title.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c))).count();
    assert!(english > 0, "其余单元应当仍是英文");
    assert!(course.lessons().count() > 0, "课程必须有课");
}

#[test]
fn translated_lesson_keeps_its_id_and_structure() {
    let course = chinese_course();
    let lesson = course.lesson("first-request").expect("first-request");
    assert_eq!(lesson.unit, "welcome");
    assert!(
        lesson.title.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c)),
        "中文课程的 lessons.title 应当是中文，实际是 {:?}",
        lesson.title
    );
}
