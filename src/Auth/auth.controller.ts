import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { createUser } from '../Users/user.service';
import { generateAuthTokens, generateResetPasswordToken, generateVerifyEmailToken } from '../Tokens/token.service';
import { loginUserWithEmailAndPassword, logout, refreshAuth, resetPassword, verifyEmail } from './auth.service';
import {
  sendAccountCreated,
  sendResetPasswordEmail,
  sendSuccessfulRegistration,
  sendVerificationEmail,
} from '../Email/email.service';
import config from '../config/config';
import { AccessAndRefreshTokens } from '../Tokens/token.interfaces';

export const sendTokens = (res: Response, tokens: AccessAndRefreshTokens) => {
  res.cookie('accessToken', tokens.access, config.jwt.cookieOptions);
  res.cookie('refreshToken', tokens.refresh, config.jwt.cookieOptions);
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const user = await createUser(req.body);
  const tokens = await generateAuthTokens(user);
  const verifyEmailToken = await generateVerifyEmailToken(user);
  await sendSuccessfulRegistration(user.email, verifyEmailToken, user.name);
  sendTokens(res, tokens);
  res.status(httpStatus.CREATED).send({ user });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await loginUserWithEmailAndPassword(email, password);
  const tokens = await generateAuthTokens(user);
  sendTokens(res, tokens);
  res.send({ user });
});

export const logoutController = catchAsync(async (req: Request, res: Response) => {
  await logout(req.cookies.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

export const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const tokens = await refreshAuth(req.cookies.refreshToken);
  sendTokens(res, tokens);
  res.status(httpStatus.OK).send();
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const resetPasswordToken = await generateResetPasswordToken(req.body.email);
  await sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

export const resetPasswordController = catchAsync(async (req: Request, res: Response) => {
  await resetPassword(req.cookies.resetPasswordToken, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

export const sendVerificationEmailController = catchAsync(async (req: Request, res: Response) => {
  const verifyEmailToken = await generateVerifyEmailToken(req.user);
  await sendVerificationEmail(req.user.email, verifyEmailToken, req.user.name);
  res.status(httpStatus.NO_CONTENT).send();
});

export const verifyEmailController = catchAsync(async (req: Request, res: Response) => {
  const user = await verifyEmail(req.cookies.verifyEmailToken);
  if (user) {
    await sendAccountCreated(user.email, user.name);
  }
  res.status(httpStatus.NO_CONTENT).send();
});
