package org.linlinjava.litemall.admin.task;

import org.linlinjava.litemall.core.task.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * 应用启动后执行的任务
 */
@Component
public class AdminTaskStartupRunner implements ApplicationRunner {
    @Autowired
    private TaskService taskService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 启动后任务
    }
}
