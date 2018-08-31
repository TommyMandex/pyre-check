(** Copyright (c) 2016-present, Facebook, Inc.

    This source code is licensed under the MIT license found in the
    LICENSE file in the root directory of this source tree. *)

open Core

open Pyre

open Ast
open Expression


type index = {
  function_keys: (Access.t Hash_set.t) String.Table.t;
  class_keys: (Type.t Hash_set.t) String.Table.t;
  alias_keys: (Type.t Hash_set.t) String.Table.t;
  global_keys: (Access.t Hash_set.t) String.Table.t;
  dependent_keys: (Access.t Hash_set.t) String.Table.t;
}

type t = {
  index: index;
  dependents: (Path.path list) Access.Table.t;
}

module type Handler = sig
  val add_function_key: handle: string -> Access.t -> unit
  val add_class_key: handle: string -> Type.t -> unit
  val add_alias_key: handle: string -> Type.t -> unit
  val add_global_key: handle: string -> Access.t -> unit
  val add_dependent_key: handle: string -> Access.t -> unit

  val add_dependent: handle: string -> Access.t -> unit

  val dependents: Access.t -> (Path.path list) option

  val get_function_keys: handle: string -> Access.t list
  val get_class_keys: handle: string -> Type.t list
  val get_alias_keys: handle: string -> Type.t list
  val get_global_keys: handle: string -> Access.t list
  val get_dependent_keys: handle: string -> Access.t list

  val clear_keys_batch: string list -> unit

end

val create: unit -> t

val copy: t -> t

val handler: t -> (module Handler)

val transitive
  :  get_dependencies: (string -> (string list) option)
  -> handle: string
  -> String.Set.t

val transitive_of_list
  :  get_dependencies: (string -> (string list) option)
  -> handles: string list
  -> String.Set.t

val of_list
  :  get_dependencies: (string -> (string list) option)
  -> handles: string list
  -> String.Set.t
