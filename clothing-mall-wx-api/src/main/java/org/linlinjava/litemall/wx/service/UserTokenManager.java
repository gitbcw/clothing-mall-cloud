package org.linlinjava.litemall.wx.service;

import org.linlinjava.litemall.wx.util.JwtHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

/**
 * 维护用户token
 */
@Component
public class UserTokenManager {
	@Autowired
	private JwtHelper jwtHelperInstance;

	private static JwtHelper jwtHelper;

	@PostConstruct
	public void init() {
		jwtHelper = this.jwtHelperInstance;
	}

	public static String generateToken(Integer id) {
		return jwtHelper.createToken(id);
	}

	public static Integer getUserId(String token) {
		Integer userId = jwtHelper.verifyTokenAndGetUserId(token);
		if(userId == null || userId == 0){
			return null;
		}
		return userId;
	}
}
