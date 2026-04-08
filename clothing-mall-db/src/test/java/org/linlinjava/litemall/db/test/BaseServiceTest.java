package org.linlinjava.litemall.db.test;

import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service 层测试基类
 * <p>
 * 使用 @Transactional 确保测试后数据回滚
 */
@RunWith(SpringRunner.class)
@SpringBootTest
@Transactional
public abstract class BaseServiceTest {
    // 子类继承即可获得事务回滚能力
}
