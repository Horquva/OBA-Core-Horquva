import 'package:sentinel_flutter/core/errors/failures.dart';

sealed class ApiResult<T> {}

class ApiSuccess<T> extends ApiResult<T> {
  final T data;
  ApiSuccess(this.data);
}

class ApiFailure<T> extends ApiResult<T> {
  final Failure failure;
  ApiFailure(this.failure);
}
