-- SPDX-FileCopyrightText: 2017 Daniel Ratcliffe
--
-- SPDX-License-Identifier: LicenseRef-CCPL

local expect = dofile("rom/modules/main/cc/expect.lua").expect

local function trilaterate(A, B, C)
    local a2b = B.vPosition - A.vPosition
    local a2c = C.vPosition - A.vPosition

    if math.abs(a2b:normalize():dot(a2c:normalize())) > 0.999 then
        return nil
    end

    local d = a2b:length()
    local ex = a2b:normalize( )
    local i = ex:dot(a2c)
    local ey = (a2c - ex * i):normalize()
    local j = ey:dot(a2c)
    local ez = ex:cross(ey)

    local r1 = A.nDistance
    local r2 = B.nDistance
    local r3 = C.nDistance

    local x = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    local y = (r1 * r1 - r3 * r3 - x * x + (x - i) * (x - i) + j * j) / (2 * j)

    local result = A.vPosition + ex * x + ey * y

    local zSquared = r1 * r1 - x * x - y * y
    if zSquared > 0 then
        local z = math.sqrt(zSquared)
        local result1 = result + ez * z
        local result2 = result - ez * z

        local rounded1, rounded2 = result1:round(0.01), result2:round(0.01)
        if rounded1.x ~= rounded2.x or rounded1.y ~= rounded2.y or rounded1.z ~= rounded2.z then
            return rounded1, rounded2
        else
            return rounded1
        end
    end
    return result:round(0.01)

end

local function narrow(p1, p2, fix)
    local dist1 = math.abs((p1 - fix.vPosition):length() - fix.nDistance)
    local dist2 = math.abs((p2 - fix.vPosition):length() - fix.nDistance)

    if math.abs(dist1 - dist2) < 0.01 then
        return p1, p2
    elseif dist1 < dist2 then
        return p1:round(0.01)
    else
        return p2:round(0.01)
    end
end

--- Tries to retrieve the computer or turtles own location.
--
-- @tparam[opt=2] number timeout The maximum time in seconds taken to establish our
-- position.
-- @tparam[opt=false] boolean debug Print debugging messages
-- @treturn[1] number This computer's `x` position.
-- @treturn[1] number This computer's `y` position.
-- @treturn[1] number This computer's `z` position.
-- @treturn[2] nil If the position could not be established.
function locate(messages)
    _bDebug = true

    local tFixes = {}
    local pos1, pos2 = nil, nil

    for i=1,4 do
      local x,y,z,distance = table.unpack(messages[i])

      local tFix = { vPosition = vector.new(x, y, z), nDistance = distance }
      if _bDebug then
          print(tFix.nDistance .. " metres from " .. tostring(tFix.vPosition))
      end
      if tFix.nDistance == 0 then
          pos1, pos2 = tFix.vPosition, nil
      else
          -- Insert our new position in our table, with a maximum of three items. If this is close to a
          -- previous position, replace that instead of inserting.
          local insIndex = math.min(3, #tFixes + 1)
          for i, older in pairs(tFixes) do
              if (older.vPosition - tFix.vPosition):length() < 1 then
                  insIndex = i
                  break
              end
          end
          tFixes[insIndex] = tFix

          if #tFixes >= 3 then
              if not pos1 then
                  pos1, pos2 = trilaterate(tFixes[1], tFixes[2], tFixes[3])
              else
                  pos1, pos2 = narrow(pos1, pos2, tFixes[3])
              end
          end
      end
      if pos1 and not pos2 then
          break
      end
    end

    -- Return the response
    if pos1 and pos2 then
        if _bDebug then
            print("Ambiguous position")
            print("Could be " .. pos1.x .. "," .. pos1.y .. "," .. pos1.z .. " or " .. pos2.x .. "," .. pos2.y .. "," .. pos2.z)
        end
        return nil
    elseif pos1 then
        if _bDebug then
            print("Position is " .. pos1.x .. "," .. pos1.y .. "," .. pos1.z)
        end
        return pos1.x, pos1.y, pos1.z
    else
        if _bDebug then
            print("Could not determine position")
        end
        return nil
    end
end

return locate