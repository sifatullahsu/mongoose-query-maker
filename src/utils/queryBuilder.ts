/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IAuthorizedFields, IQueryOperations, IReceviedQuery, IUser } from '../types'
import valueMaker from './valueMaker'

const queryBuilder = (queryElements: IReceviedQuery, authorizedFields: IAuthorizedFields, user: IUser) => {
  const { all, filter } = authorizedFields

  // Initialize arrays to store query and authentication conditions
  const $and: Record<string, any>[] = []
  const authentication: Record<string, any>[] = []

  // Loop through query elements provided
  for (const [key, values] of Object.entries(queryElements)) {
    // If 'values' is not an array, convert it to an array
    const valuesArray: (string | number)[] = Array.isArray(values) ? values : [values]

    // Iterate through each value for the current key
    for (const value of valuesArray) {
      // Find the corresponding filter item based on the key
      const filteredItem = filter.find(i => i[0] === key)

      // Throw an error if no filter item is found
      if (!filteredItem) {
        throw new Error('Not authorized query.')
      }

      // Destructure the filter item
      const [fieldName, allowedOperations, authRules] = filteredItem

      // Split the value to get the operation and query data
      const [operation, queryRawData] = (value as string).split(':')
      const queryData = valueMaker(operation as IQueryOperations, queryRawData)

      // Check if the requested operation is allowed
      if (!allowedOperations.includes(operation)) {
        throw new Error(`Unauthorized: '${operation}' on '${key}'`)
      }

      // Check authentication rules
      if (authRules === 'OPEN' || (Array.isArray(authRules) && authRules[0] === 'ANY' && user)) {
        // Add the query and authentication conditions
        $and.push({ [key]: { [operation]: queryData } })
        authentication.push({ [key]: { [operation]: queryData } })
      } else if (!user) {
        // Unauthorized if user is not logged in
        throw new Error(`Unauthorized: 'required_registered_user' on '${key}'`)
      } else {
        // Find the specific authentication rule based on user role
        const authInfo = authRules.find((x: string) => x[0] === user.role)

        if (authInfo) {
          if (authInfo[1] === 'OPEN') {
            // Add the query and authentication conditions
            $and.push({ [key]: { [operation]: queryData } })
            authentication.push({ [key]: { [operation]: queryData } })
          } else {
            // Add user-specific authentication conditions
            $and.push({ [key]: { [operation]: queryData } }, { [authInfo[0]]: { $eq: user._id } })
            authentication.push({ [authInfo[0]]: { $eq: user._id } })
          }
        } else {
          // Unauthorized if no matching role-based access
          throw new Error(`Unauthorized: 'user_role_access' on '${key}'`)
        }
      }
    }
  }

  if ($and.length === 0 && all !== 'OPEN') {
    if (all[0] === 'ANY' && !user) {
      throw new Error("Unauthorized access: 'user_role_access' is not permitted on the entire dataset")
    } else {
      const isAuthenticate = all.find(i => i === user?.role)
      if (!isAuthenticate) {
        throw new Error("Unauthorized access: 'user_role_access' is not permitted on the entire dataset")
      }
    }
  }

  // Return the final query and authentication conditions
  return {
    query: $and.length === 0 ? {} : { $and },
    authentication
  }
}

export default queryBuilder